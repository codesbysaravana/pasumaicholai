import type { Request, Response } from 'express';
import { z } from 'zod';
import { UserModel } from '../../models/user.model.js';
import {
  deleteListingImages,
  deleteRemovedS3Images,
  normalizeListingImagesForStorage,
} from '../../services/s3Service.js';
import { ApiError } from '../../utils/api-error.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { MarketplaceListingModel } from './marketplace.model.js';

const createListingSchema = z.object({
  cropName: z.string().min(2, 'Crop name is required').optional(),
  productName: z.string().min(2, 'Product name is required').optional(),
  category: z.enum(['fruit', 'vegetable', 'grain', 'other']),
  quantity: z.coerce.number().positive('Quantity should be greater than 0').optional(),
  quantityAvailable: z.coerce.number().positive('Quantity should be greater than 0').optional(),
  pricePerKg: z.coerce.number().positive('Price should be greater than 0'),
  harvestDate: z.coerce.date(),
  description: z.string().min(5, 'Description is required'),
  location: z.string().min(2, 'Location is required'),
  images: z.array(z.string()).max(6).default([]),
  unit: z.enum(['kg', 'ton', 'crate']).default('kg'),
});

const updateListingSchema = createListingSchema.partial().extend({
  status: z.enum(['active', 'sold', 'draft']).optional(),
  isActive: z.boolean().optional(),
});

function serializeListing(document: any) {
  const resolvedName = document.productName || document.cropName;
  const resolvedQuantity = document.quantityAvailable ?? document.quantity;
  return {
    id: String(document._id),
    farmerId: document.farmerId,
    farmer: {
      name: document.farmer?.name ?? 'Farmer',
      phone: document.farmer?.phone ?? '',
      location: document.farmer?.location ?? document.location,
      village: document.farmer?.village ?? '',
      state: document.farmer?.state ?? '',
      rating: document.farmer?.rating ?? 0,
    },
    cropName: resolvedName,
    productName: resolvedName,
    category: document.category,
    quantity: resolvedQuantity,
    quantityAvailable: resolvedQuantity,
    pricePerKg: document.pricePerKg,
    harvestDate: document.harvestDate.toISOString(),
    description: document.description,
    location: document.farmer?.location ?? document.location,
    images: document.images,
    unit: document.unit ?? 'kg',
    isActive: document.isActive ?? document.status !== 'draft',
    status: document.status,
    createdAt: document.createdAt.toISOString(),
  };
}

export const createListing = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const parsed = createListingSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? 'Invalid listing payload');
  }

  const productName = parsed.data.productName ?? parsed.data.cropName;
  const quantityAvailable = parsed.data.quantityAvailable ?? parsed.data.quantity;
  if (!productName || !quantityAvailable) {
    throw new ApiError(400, 'Product name and quantity are required');
  }

  const farmer = await UserModel.findById(req.user.id).lean();
  const normalizedImages = await normalizeListingImagesForStorage(parsed.data.images ?? [], req.user.id);
  const listing = await MarketplaceListingModel.create({
    ...parsed.data,
    images: normalizedImages,
    cropName: productName,
    productName,
    quantity: quantityAvailable,
    quantityAvailable,
    farmerId: req.user.id,
    farmer: {
      name: farmer?.fullName ?? 'Farmer',
      phone: farmer?.phone ?? '',
      location: parsed.data.location,
      village: '',
      state: '',
      rating: 0,
    },
    isActive: true,
    status: 'active',
  });

  res.status(201).json({
    success: true,
    message: 'Listing published successfully',
    data: serializeListing({
      ...listing.toObject(),
      _id: listing._id,
    }),
  });
});

export const getListings = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as {
    category?: string;
    location?: string;
    price_min?: string;
    price_max?: string;
    search?: string;
    sort?: string;
  };
  const filter: Record<string, unknown> = {
    isActive: true,
    status: { $ne: 'draft' },
  };
  if (query.category) {
    filter.category = query.category;
  }
  if (query.location) {
    filter.location = { $regex: query.location, $options: 'i' };
  }
  if (query.search) {
    filter.$or = [
      { cropName: { $regex: query.search, $options: 'i' } },
      { productName: { $regex: query.search, $options: 'i' } },
      { description: { $regex: query.search, $options: 'i' } },
      { 'farmer.name': { $regex: query.search, $options: 'i' } },
    ];
  }
  if (query.price_min || query.price_max) {
    filter.pricePerKg = {
      ...(query.price_min ? { $gte: Number(query.price_min) } : {}),
      ...(query.price_max ? { $lte: Number(query.price_max) } : {}),
    };
  }

  const sort =
    query.sort === 'price_asc'
      ? { pricePerKg: 1 as const }
      : query.sort === 'price_desc'
        ? { pricePerKg: -1 as const }
        : { createdAt: -1 as const };
  const listings = await MarketplaceListingModel.find(filter).sort(sort).lean();

  res.status(200).json({
    success: true,
    data: listings.map((listing) => serializeListing(listing)),
  });
});

export const getMyListings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const listings = await MarketplaceListingModel.find({ farmerId: req.user.id }).sort({ createdAt: -1 }).lean();

  res.status(200).json({
    success: true,
    data: listings.map((listing) => serializeListing(listing)),
  });
});

export const getListingById = asyncHandler(async (req: Request, res: Response) => {
  const listing = await MarketplaceListingModel.findById(req.params.id).lean();
  if (!listing) {
    throw new ApiError(404, 'Listing not found');
  }

  res.status(200).json({
    success: true,
    data: serializeListing(listing),
  });
});

export const updateListing = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const parsed = updateListingSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? 'Invalid listing update payload');
  }

  const listing = await MarketplaceListingModel.findById(req.params.id);
  if (!listing) {
    throw new ApiError(404, 'Listing not found');
  }

  if (listing.farmerId !== req.user.id) {
    throw new ApiError(403, 'You can only update your own listings');
  }

  const nextName = parsed.data.productName ?? parsed.data.cropName;
  const nextQuantity = parsed.data.quantityAvailable ?? parsed.data.quantity;
  const nextImages =
    parsed.data.images !== undefined
      ? await normalizeListingImagesForStorage(parsed.data.images, req.user.id)
      : undefined;

  if (nextImages) {
    await deleteRemovedS3Images(listing.images ?? [], nextImages);
  }

  Object.assign(listing, parsed.data, {
    ...(nextImages ? { images: nextImages } : {}),
    ...(nextName ? { cropName: nextName, productName: nextName } : {}),
    ...(nextQuantity ? { quantity: nextQuantity, quantityAvailable: nextQuantity } : {}),
  });
  await listing.save();

  res.status(200).json({
    success: true,
    message: 'Listing updated successfully',
    data: serializeListing({
      ...listing.toObject(),
      _id: listing._id,
    }),
  });
});

export const deleteListing = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const listing = await MarketplaceListingModel.findById(req.params.id);
  if (!listing) {
    throw new ApiError(404, 'Listing not found');
  }

  if (listing.farmerId !== req.user.id) {
    throw new ApiError(403, 'You can only delete your own listings');
  }

  await deleteListingImages(listing.images ?? []);
  await listing.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Listing deleted successfully',
    data: { id: req.params.id },
  });
});
