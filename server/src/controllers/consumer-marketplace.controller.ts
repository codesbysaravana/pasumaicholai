import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { CartModel } from '../models/cart.model.js';
import { MarketplaceListingModel } from '../modules/marketplace/marketplace.model.js';
import { NotificationModel } from '../models/notification.model.js';
import { OrderModel } from '../models/order.model.js';
import { ProductModel } from '../models/product.model.js';
import { UserModel } from '../models/user.model.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';

const productFiltersSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  location: z.string().optional(),
  price_min: z.coerce.number().min(0).optional(),
  price_max: z.coerce.number().min(0).optional(),
  sort: z.enum(['latest', 'price_asc', 'price_desc', 'quantity_desc']).optional(),
});

const orderProductSchema = z.object({
  product_id: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
});

const cartSchema = z.object({
  items: z.array(orderProductSchema).max(50),
});

const orderSchema = z.object({
  consumer_id: z.string().min(1),
  farmer_id: z.string().min(1),
  products: z.array(orderProductSchema).min(1),
  total_price: z.coerce.number().positive(),
  delivery_address: z.object({
    name: z.string().min(2),
    phone: z.string().min(6),
    location: z.string().min(2),
    notes: z.string().optional(),
  }),
});

const directOrderSchema = z.object({
  listingId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
});

type InventorySource = {
  source: 'product' | 'listing';
  id: mongoose.Types.ObjectId;
  farmerId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  pricePerKg: number;
  quantityAvailable: number;
  location: string;
  category: string;
  imageUrl: string;
  createdAt: Date;
  farmerName: string;
  farmerPhone: string;
};

function ensureObjectId(value: string, label: string): mongoose.Types.ObjectId {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `Invalid ${label}`);
  }
  return new mongoose.Types.ObjectId(value);
}

async function resolveInventorySource(rawId: string): Promise<InventorySource | null> {
  const objectId = ensureObjectId(rawId, 'listing/product id');
  const listing = await MarketplaceListingModel.findById(objectId).lean();
  if (listing) {
    const farmerId = ensureObjectId(listing.farmerId, 'farmer id');
    return {
      source: 'listing',
      id: listing._id,
      farmerId,
      name: listing.productName || listing.cropName,
      description: listing.description,
      pricePerKg: listing.pricePerKg,
      quantityAvailable: listing.quantityAvailable ?? listing.quantity,
      location: listing.farmer?.location || listing.location,
      category: listing.category,
      imageUrl: listing.images?.[0] ?? '',
      createdAt: listing.createdAt,
      farmerName: listing.farmer?.name ?? 'Farmer',
      farmerPhone: listing.farmer?.phone ?? '',
    };
  }

  const product = await ProductModel.findById(objectId).populate('sellerId', 'fullName phone').lean();
  if (!product) {
    return null;
  }
  const seller = product.sellerId as { _id?: mongoose.Types.ObjectId; fullName?: string; phone?: string } | undefined;
  const farmerId = seller?._id ?? product.sellerId;
  return {
    source: 'product',
    id: product._id,
    farmerId: ensureObjectId(String(farmerId), 'farmer id'),
    name: product.name,
    description: product.description,
    pricePerKg: product.pricePerKg,
    quantityAvailable: product.quantityKg,
    location: product.location,
    category: product.cropType,
    imageUrl: '',
    createdAt: product.createdAt,
    farmerName: seller?.fullName ?? 'Farmer',
    farmerPhone: (seller as any)?.phone || (seller as any)?.mobile || '',
  };
}

export const getMarketplaceProducts = asyncHandler(async (req: Request, res: Response) => {
  const parsed = productFiltersSchema.safeParse(req.query);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? 'Invalid filter query');
  }

  const { search, category, location, price_min, price_max, sort } = parsed.data;
  const filter: Record<string, unknown> = {
    isActive: true,
    status: { $ne: 'draft' },
  };
  if (category) {
    filter.category = category;
  }
  if (location) {
    filter.location = { $regex: location, $options: 'i' };
  }
  if (typeof price_min === 'number' || typeof price_max === 'number') {
    filter.pricePerKg = {
      ...(typeof price_min === 'number' ? { $gte: price_min } : {}),
      ...(typeof price_max === 'number' ? { $lte: price_max } : {}),
    };
  }
  if (search) {
    filter.$or = [
      { cropName: { $regex: search, $options: 'i' } },
      { productName: { $regex: search, $options: 'i' } },
      { location: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { 'farmer.name': { $regex: search, $options: 'i' } },
    ];
  }

  const listingSort: Record<string, 1 | -1> =
    sort === 'price_asc'
      ? { pricePerKg: 1 as const }
      : sort === 'price_desc'
        ? { pricePerKg: -1 as const }
        : sort === 'quantity_desc'
          ? { quantityAvailable: -1 as const }
          : { createdAt: -1 as const };
  const listings = await MarketplaceListingModel.find(filter).sort(listingSort).lean();

  res.status(200).json({
    success: true,
    data: listings.map((listing) => {
      return {
        id: String(listing._id),
        farmer_id: listing.farmerId,
        farmer_name: listing.farmer?.name ?? 'Farmer',
        farmer_phone: listing.farmer?.phone ?? '',
        name: listing.productName || listing.cropName,
        description: listing.description,
        price: listing.pricePerKg,
        quantity: listing.quantityAvailable ?? listing.quantity,
        location: listing.farmer?.location || listing.location,
        category: listing.category,
        image_url: listing.images?.[0] ?? '',
        created_at: listing.createdAt.toISOString(),
      };
    }),
  });
});

export const getMarketplaceProductById = asyncHandler(async (req: Request, res: Response) => {
  const resolved = await resolveInventorySource(req.params.id ?? '');
  if (!resolved) {
    throw new ApiError(404, 'Product/listing not found');
  }

  res.status(200).json({
    success: true,
    data: {
      id: String(resolved.id),
      farmer_id: String(resolved.farmerId),
      farmer_name: resolved.farmerName,
      farmer_phone: resolved.farmerPhone,
      name: resolved.name,
      description: resolved.description,
      price: resolved.pricePerKg,
      quantity: resolved.quantityAvailable,
      location: resolved.location,
      category: resolved.category,
      image_url: resolved.imageUrl,
      created_at: resolved.createdAt.toISOString(),
    },
  });
});

export const upsertCart = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const parsed = cartSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? 'Invalid cart payload');
  }

  const consumerId = ensureObjectId(req.user.id, 'consumer id');
  const normalizedItems = await Promise.all(
    parsed.data.items.map(async (item) => {
      const inventory = await resolveInventorySource(item.product_id);
      if (!inventory) {
        throw new ApiError(404, `Product/listing not found for id ${item.product_id}`);
      }
      return {
        productId: inventory.id,
        quantity: Math.min(item.quantity, inventory.quantityAvailable),
        price: inventory.pricePerKg,
        farmerId: inventory.farmerId,
      };
    }),
  );

  const subtotal = normalizedItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const cart = await CartModel.findOneAndUpdate(
    { consumerId },
    {
      consumerId,
      items: normalizedItems,
      subtotal,
    },
    { upsert: true, returnDocument: 'after' },
  ).lean();

  res.status(200).json({
    success: true,
    data: {
      items: cart?.items.map((item) => ({
        product_id: String(item.productId),
        quantity: item.quantity,
      })),
      subtotal: cart?.subtotal ?? 0,
    },
  });
});

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const parsed = orderSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? 'Invalid order payload');
  }

  if (req.user.id !== parsed.data.consumer_id) {
    throw new ApiError(403, 'Order consumer does not match authenticated user');
  }

  const consumerId = ensureObjectId(parsed.data.consumer_id, 'consumer id');
  const farmerId = ensureObjectId(parsed.data.farmer_id, 'farmer id');

  const mappedItems = await Promise.all(
    parsed.data.products.map(async (entry) => {
      const inventory = await resolveInventorySource(entry.product_id);
      if (!inventory) {
        throw new ApiError(404, `Product/listing not found for id ${entry.product_id}`);
      }
      if (String(inventory.farmerId) !== String(farmerId)) {
        throw new ApiError(400, 'All products must belong to selected farmer');
      }
      if (entry.quantity > inventory.quantityAvailable) {
        throw new ApiError(400, `Insufficient quantity for ${inventory.name}`);
      }
      return {
        productId: inventory.id,
        quantity: entry.quantity,
        price: inventory.pricePerKg,
        source: inventory.source,
        productName: inventory.name,
        pickupLocation: inventory.location,
      };
    }),
  );

  const computedTotal = mappedItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const deliveryAddress = parsed.data.delivery_address.notes
    ? {
      name: parsed.data.delivery_address.name,
      phone: parsed.data.delivery_address.phone,
      location: parsed.data.delivery_address.location,
      notes: parsed.data.delivery_address.notes,
    }
    : {
      name: parsed.data.delivery_address.name,
      phone: parsed.data.delivery_address.phone,
      location: parsed.data.delivery_address.location,
    };

  const order = await OrderModel.create({
    consumerId,
    farmerId,
    items: mappedItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
    })),
    productName: mappedItems[0]?.productName ?? 'Product',
    quantity: mappedItems[0]?.quantity ?? 1,
    pricePerKg: mappedItems[0]?.price ?? 0,
    orderStatus: 'placed',
    purchaseStatus: 'BOUGHT',
    purchaseTime: new Date(),
    deliveryStatus: 'PENDING_PICKUP',
    pickupLocation: mappedItems[0]?.pickupLocation ?? '',
    totalPrice: computedTotal,
    deliveryAddress,
  });

  await Promise.all(
    mappedItems.map(async (item) => {
      if (item.source === 'product') {
        await ProductModel.updateOne({ _id: item.productId }, { $inc: { quantityKg: -item.quantity } });
      } else {
        await MarketplaceListingModel.updateOne(
          { _id: item.productId },
          { $inc: { quantityAvailable: -item.quantity, quantity: -item.quantity } },
        );
      }
    }),
  );
  await NotificationModel.create({
    userId: farmerId,
    message: `New order received for your product ${mappedItems[0]?.productName ?? ''}`.trim(),
    type: 'order',
    read: false,
  });

  const farmer = await UserModel.findById(farmerId).select('mobile').lean();

  res.status(201).json({
    success: true,
    data: {
      id: String((order as { _id: mongoose.Types.ObjectId })._id),
      farmer_contact: farmer?.mobile ?? '',
      expected_delivery_window: '2-4 days',
    },
  });
});

export const createOrderFromListing = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const parsed = directOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? 'Invalid listing order payload');
  }

  const listing = await MarketplaceListingModel.findById(parsed.data.listingId);
  if (!listing || !listing.isActive || listing.status === 'draft') {
    throw new ApiError(404, 'Listing not found');
  }
  const available = listing.quantityAvailable ?? listing.quantity;
  if (parsed.data.quantity > available) {
    throw new ApiError(400, 'Requested quantity exceeds available stock');
  }

  const consumerId = ensureObjectId(req.user.id, 'consumer id');
  const farmerId = ensureObjectId(listing.farmerId, 'farmer id');
  const totalPrice = parsed.data.quantity * listing.pricePerKg;

  const order = await OrderModel.create({
    consumerId,
    farmerId,
    listingId: listing._id,
    productName: listing.productName || listing.cropName,
    quantity: parsed.data.quantity,
    pricePerKg: listing.pricePerKg,
    items: [
      {
        productId: listing._id,
        quantity: parsed.data.quantity,
        price: listing.pricePerKg,
      },
    ],
    totalPrice,
    status: 'placed',
    orderStatus: 'placed',
    purchaseStatus: 'BOUGHT',
    purchaseTime: new Date(),
    deliveryStatus: 'PENDING_PICKUP',
    pickupLocation: listing.farmer?.location || listing.location || '',
    deliveryAddress: {
      name: 'Marketplace Consumer',
      phone: '0000000000',
      location: 'Marketplace Order',
    },
  });

  listing.quantityAvailable = available - parsed.data.quantity;
  listing.quantity = listing.quantityAvailable;
  if (listing.quantityAvailable <= 0) {
    listing.isActive = false;
    listing.status = 'sold';
  }
  await listing.save();

  await NotificationModel.create({
    userId: farmerId,
    message: `New order received for your product ${listing.productName || listing.cropName}`,
    type: 'order',
    read: false,
  });

  res.status(201).json({
    success: true,
    data: {
      id: String(order._id),
      orderStatus: 'placed',
      totalPrice,
    },
  });
});

export const getFarmerOrders = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const farmerId = ensureObjectId(req.user.id, 'farmer id');
  const orders = await OrderModel.find({ farmerId })
    .sort({ createdAt: -1 })
    .populate('consumerId', 'fullName')
    .populate('items.productId', 'name')
    .lean();

  res.status(200).json({
    success: true,
    data: orders.map((order) => ({
      id: String(order._id),
      buyerName: (order.consumerId as { fullName?: string } | undefined)?.fullName ?? 'Consumer',
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      products: order.items.map((item) => ({
        productName: (item.productId as { name?: string } | undefined)?.name ?? order.productName ?? 'Product',
        quantity: item.quantity,
        price: item.price,
      })),
    })),
  });
});
