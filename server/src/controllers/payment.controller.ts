import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import type Stripe from 'stripe';
import { MarketplaceListingModel } from '../modules/marketplace/marketplace.model.js';
import { NotificationModel } from '../models/notification.model.js';
import { OrderModel } from '../models/order.model.js';
import { UserModel } from '../models/user.model.js';
import { razorpayService } from '../services/razorpay.service.js';
import { sendPaymentCompletedSms } from '../services/sns-notification.service.js';
import { stripeService } from '../services/stripe.service.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import {
  createCheckoutVerificationToken,
  verifyCheckoutVerificationToken,
} from '../utils/payment_verification.js';

const checkoutItemSchema = z.object({
  listingId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
});

const createCheckoutSessionSchema = z.object({
  items: z.array(checkoutItemSchema).min(1).max(20),
  delivery_address: z.object({
    name: z.string().min(2),
    phone: z.string().min(6),
    location: z.string().min(2),
    notes: z.string().max(200).optional(),
  }),
});

const createRazorpayOrderSchema = createCheckoutSessionSchema;

const verifyRazorpayPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  checkout_token: z.string().min(1),
});

const razorpayWebhookEventSchema = z.object({
  event: z.string().min(1),
  payload: z
    .object({
      payment: z
        .object({
          entity: z.object({
            id: z.string().optional(),
            order_id: z.string().optional(),
            status: z.string().optional(),
          }),
        })
        .optional(),
    })
    .optional(),
});

function ensureObjectId(value: string, label: string): mongoose.Types.ObjectId {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `Invalid ${label}`);
  }
  return new mongoose.Types.ObjectId(value);
}

interface ParsedOrderMetadata {
  consumerId: string;
  farmerId: string;
  deliveryAddress: {
    name: string;
    phone: string;
    location: string;
    notes?: string | undefined;
  };
  items: Array<{
    listingId: string;
    quantity: number;
  }>;
}

function parseOrderMetadata(metadata: Record<string, string>): ParsedOrderMetadata {
  const consumerId = metadata.consumerId ?? '';
  const farmerId = metadata.farmerId ?? '';
  const itemsRaw = metadata.items ?? '[]';
  const deliveryRaw = metadata.deliveryAddress ?? '{}';

  const items = z.array(checkoutItemSchema).parse(JSON.parse(itemsRaw));
  const deliveryAddress = createCheckoutSessionSchema.shape.delivery_address.parse(JSON.parse(deliveryRaw));

  if (!consumerId || !farmerId) {
    throw new ApiError(400, 'Missing Stripe checkout metadata');
  }

  return {
    consumerId,
    farmerId,
    items,
    deliveryAddress,
  };
}

async function resolveCheckoutListings(items: Array<{ listingId: string; quantity: number }>) {
  const listingIds = items.map((item) => ensureObjectId(item.listingId, 'listing id'));
  const listings = await MarketplaceListingModel.find({ _id: { $in: listingIds }, isActive: true, status: { $ne: 'draft' } }).lean();

  if (listings.length !== items.length) {
    throw new ApiError(404, 'One or more listings are unavailable');
  }

  const uniqueFarmerIds = new Set(listings.map((listing) => listing.farmerId));
  if (uniqueFarmerIds.size !== 1) {
    throw new ApiError(400, 'Checkout supports one farmer per session');
  }

  for (const item of items) {
    const listing = listings.find((entry) => String(entry._id) === item.listingId);
    if (!listing) {
      throw new ApiError(404, `Listing not found: ${item.listingId}`);
    }
    const available = listing.quantityAvailable ?? listing.quantity;
    if (item.quantity > available) {
      throw new ApiError(400, `Requested quantity exceeds stock for ${listing.productName || listing.cropName}`);
    }
  }

  return {
    listings,
    farmerId: Array.from(uniqueFarmerIds)[0] ?? '',
  };
}

function buildDeliveryAddress(deliveryAddress: ParsedOrderMetadata['deliveryAddress']): {
  name: string;
  phone: string;
  location: string;
  notes?: string;
} {
  return deliveryAddress.notes
    ? {
        name: deliveryAddress.name,
        phone: deliveryAddress.phone,
        location: deliveryAddress.location,
        notes: deliveryAddress.notes,
      }
    : {
        name: deliveryAddress.name,
        phone: deliveryAddress.phone,
        location: deliveryAddress.location,
      };
}

async function notifyPaymentSuccessBySms(params: {
  consumerId: mongoose.Types.ObjectId;
  farmerId: mongoose.Types.ObjectId;
  orderId: string;
  productName: string;
  totalPrice: number;
}): Promise<void> {
  const users = await UserModel.find({ _id: { $in: [params.consumerId, params.farmerId] } })
    .select('_id fullName mobile phone')
    .lean();

  const consumer = users.find((user) => String(user._id) === String(params.consumerId));
  const farmer = users.find((user) => String(user._id) === String(params.farmerId));

  await sendPaymentCompletedSms({
    orderId: params.orderId,
    productName: params.productName,
    amount: params.totalPrice,
    consumerName: consumer?.fullName,
    farmerName: farmer?.fullName,
    consumerPhone: consumer?.mobile || consumer?.phone || null,
    farmerPhone: farmer?.mobile || farmer?.phone || null,
  });
}

export const createCheckoutSession = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }
  if (!stripeService.isConfigured()) {
    throw new ApiError(400, 'Stripe is not configured');
  }

  const parsed = createCheckoutSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? 'Invalid checkout payload');
  }

  const consumerId = req.user.id;
  const { listings, farmerId } = await resolveCheckoutListings(parsed.data.items);

  const lineItems = parsed.data.items.map((item) => {
    const listing = listings.find((entry) => String(entry._id) === item.listingId);
    if (!listing) {
      throw new ApiError(404, `Listing not found: ${item.listingId}`);
    }
    const available = listing.quantityAvailable ?? listing.quantity;
    if (item.quantity > available) {
      throw new ApiError(400, `Requested quantity exceeds stock for ${listing.productName || listing.cropName}`);
    }

    return {
      name: listing.productName || listing.cropName,
      description: listing.description,
      unitAmountInPaise: Math.round(listing.pricePerKg * 100),
      quantity: item.quantity,
      ...(listing.images?.[0] ? { imageUrl: listing.images[0] } : {}),
    };
  });

  const user = await UserModel.findById(consumerId).select('email').lean();
  const session = await stripeService.createCheckoutSession({
    ...(user?.email ? { customerEmail: user.email } : {}),
    lineItems,
    metadata: {
      consumerId,
      farmerId,
      items: JSON.stringify(parsed.data.items),
      deliveryAddress: JSON.stringify(parsed.data.delivery_address),
    },
  });

  res.status(200).json({
    success: true,
    data: {
      sessionId: session.id,
      url: session.url ?? '',
    },
  });
});

async function finalizeSuccessfulCheckout(session: Stripe.Checkout.Session): Promise<void> {
  if (!session.id) {
    throw new ApiError(400, 'Invalid Stripe checkout session');
  }

  const existingOrder = await OrderModel.findOne({ checkoutSessionId: session.id }).lean();
  if (existingOrder) {
    return;
  }

  const metadata = parseOrderMetadata((session.metadata ?? {}) as Record<string, string>);
  const consumerId = ensureObjectId(metadata.consumerId, 'consumer id');
  const farmerId = ensureObjectId(metadata.farmerId, 'farmer id');

  const listings = await Promise.all(
    metadata.items.map(async (item) => {
      const listingId = ensureObjectId(item.listingId, 'listing id');
      const listing = await MarketplaceListingModel.findById(listingId);
      if (!listing || !listing.isActive || listing.status === 'draft') {
        throw new ApiError(404, `Listing not found for ${item.listingId}`);
      }
      if (String(listing.farmerId) !== metadata.farmerId) {
        throw new ApiError(400, 'Invalid farmer/listing mapping');
      }
      const available = listing.quantityAvailable ?? listing.quantity;
      if (item.quantity > available) {
        throw new ApiError(400, `Insufficient quantity for ${listing.productName || listing.cropName}`);
      }
      return { listing, quantity: item.quantity };
    }),
  );

  const totalPrice = listings.reduce((sum, item) => sum + item.quantity * item.listing.pricePerKg, 0);
  const first = listings[0];
  const deliveryAddress = metadata.deliveryAddress.notes
    ? {
        name: metadata.deliveryAddress.name,
        phone: metadata.deliveryAddress.phone,
        location: metadata.deliveryAddress.location,
        notes: metadata.deliveryAddress.notes,
      }
    : {
        name: metadata.deliveryAddress.name,
        phone: metadata.deliveryAddress.phone,
        location: metadata.deliveryAddress.location,
      };

  const order = await OrderModel.create({
    consumerId,
    farmerId,
    ...(first?.listing?._id ? { listingId: first.listing._id } : {}),
    productName: first?.listing.productName || first?.listing.cropName || 'Product',
    quantity: first?.quantity ?? 1,
    pricePerKg: first?.listing.pricePerKg ?? 0,
    items: listings.map((item) => ({
      productId: item.listing._id,
      quantity: item.quantity,
      price: item.listing.pricePerKg,
    })),
    totalPrice,
    status: 'placed',
    orderStatus: 'placed',
    paymentProvider: 'stripe',
    paymentStatus: 'paid',
    purchaseStatus: 'BOUGHT',
    purchaseTime: new Date(),
    deliveryStatus: 'PENDING_PICKUP',
    pickupLocation: first?.listing.farmer?.location || first?.listing.location || '',
    checkoutSessionId: session.id,
    deliveryAddress,
  });

  await Promise.all(
    listings.map(async (item) => {
      const available = item.listing.quantityAvailable ?? item.listing.quantity;
      item.listing.quantityAvailable = available - item.quantity;
      item.listing.quantity = item.listing.quantityAvailable;
      if (item.listing.quantityAvailable <= 0) {
        item.listing.isActive = false;
        item.listing.status = 'sold';
      }
      await item.listing.save();
    }),
  );

  await NotificationModel.create({
    userId: farmerId,
    message: `New paid order received for your product ${(order as { productName?: string }).productName ?? 'Product'}`,
    type: 'order',
    read: false,
  });

  await notifyPaymentSuccessBySms({
    consumerId,
    farmerId,
    orderId: String((order as { _id: mongoose.Types.ObjectId })._id),
    productName: (order as { productName?: string }).productName ?? 'Product',
    totalPrice,
  });
}

async function finalizeSuccessfulRazorpayCheckout(
  metadata: ParsedOrderMetadata,
  razorpayOrderId: string,
  razorpayPaymentId: string,
): Promise<string> {
  const existingOrder = await OrderModel.findOne({ checkoutSessionId: razorpayOrderId }).lean();
  if (existingOrder) {
    return String(existingOrder._id);
  }

  const consumerId = ensureObjectId(metadata.consumerId, 'consumer id');
  const farmerId = ensureObjectId(metadata.farmerId, 'farmer id');

  const listings = await Promise.all(
    metadata.items.map(async (item) => {
      const listingId = ensureObjectId(item.listingId, 'listing id');
      const listing = await MarketplaceListingModel.findById(listingId);
      if (!listing || !listing.isActive || listing.status === 'draft') {
        throw new ApiError(404, `Listing not found for ${item.listingId}`);
      }
      if (String(listing.farmerId) !== metadata.farmerId) {
        throw new ApiError(400, 'Invalid farmer/listing mapping');
      }
      const available = listing.quantityAvailable ?? listing.quantity;
      if (item.quantity > available) {
        throw new ApiError(400, `Insufficient quantity for ${listing.productName || listing.cropName}`);
      }
      return { listing, quantity: item.quantity };
    }),
  );

  const totalPrice = listings.reduce((sum, item) => sum + item.quantity * item.listing.pricePerKg, 0);
  const first = listings[0];
  const deliveryAddress = buildDeliveryAddress(metadata.deliveryAddress);

  const order = await OrderModel.create({
    consumerId,
    farmerId,
    ...(first?.listing?._id ? { listingId: first.listing._id } : {}),
    productName: first?.listing.productName || first?.listing.cropName || 'Product',
    quantity: first?.quantity ?? 1,
    pricePerKg: first?.listing.pricePerKg ?? 0,
    items: listings.map((item) => ({
      productId: item.listing._id,
      quantity: item.quantity,
      price: item.listing.pricePerKg,
    })),
    totalPrice,
    status: 'placed',
    orderStatus: 'placed',
    paymentProvider: 'razorpay',
    paymentStatus: 'paid',
    paymentId: razorpayPaymentId,
    paidAt: new Date(),
    purchaseStatus: 'BOUGHT',
    purchaseTime: new Date(),
    deliveryStatus: 'PENDING_PICKUP',
    pickupLocation: first?.listing.farmer?.location || first?.listing.location || '',
    farmerNotified: false,
    checkoutSessionId: razorpayOrderId,
    deliveryAddress,
  });

  await Promise.all(
    listings.map(async (item) => {
      const available = item.listing.quantityAvailable ?? item.listing.quantity;
      item.listing.quantityAvailable = available - item.quantity;
      item.listing.quantity = item.listing.quantityAvailable;
      if (item.listing.quantityAvailable <= 0) {
        item.listing.isActive = false;
        item.listing.status = 'sold';
      }
      await item.listing.save();
    }),
  );

  await NotificationModel.create({
    userId: farmerId,
    message: `New paid order received for your product ${(order as { productName?: string }).productName ?? 'Product'}`,
    type: 'order',
    read: false,
  });

  await notifyPaymentSuccessBySms({
    consumerId,
    farmerId,
    orderId: String((order as { _id: mongoose.Types.ObjectId })._id),
    productName: (order as { productName?: string }).productName ?? 'Product',
    totalPrice,
  });

  return String((order as { _id: mongoose.Types.ObjectId })._id);
}

export const createRazorpayOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }
  if (!razorpayService.isConfigured()) {
    throw new ApiError(400, 'Razorpay is not configured');
  }

  const parsed = createRazorpayOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? 'Invalid checkout payload');
  }

  const consumerId = req.user.id;
  const { listings, farmerId } = await resolveCheckoutListings(parsed.data.items);
  const amountInPaise = parsed.data.items.reduce((sum, item) => {
    const listing = listings.find((entry) => String(entry._id) === item.listingId);
    if (!listing) {
      throw new ApiError(404, `Listing not found: ${item.listingId}`);
    }
    return sum + Math.round(item.quantity * listing.pricePerKg * 100);
  }, 0);

  if (amountInPaise <= 0) {
    throw new ApiError(400, 'Checkout amount must be greater than zero');
  }

  const checkoutToken = createCheckoutVerificationToken({
    consumerId,
    farmerId,
    amountInPaise,
    currency: 'INR',
    deliveryAddress: parsed.data.delivery_address,
    items: parsed.data.items,
  });

  const receipt = `pc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`.slice(0, 40);
  const order = await razorpayService.createOrder({
    amountInPaise,
    currency: 'INR',
    receipt,
    notes: {
      consumerId,
      farmerId,
    },
  });

  res.status(200).json({
    success: true,
    data: {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: razorpayService.getPublicKeyId(),
      checkout_token: checkoutToken,
    },
  });
});

export const verifyRazorpayPayment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }
  if (!razorpayService.isConfigured()) {
    throw new ApiError(400, 'Razorpay is not configured');
  }

  const parsed = verifyRazorpayPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? 'Invalid Razorpay verification payload');
  }

  const checkoutPayload = verifyCheckoutVerificationToken(parsed.data.checkout_token);
  if (checkoutPayload.consumerId !== req.user.id) {
    throw new ApiError(403, 'Checkout consumer does not match authenticated user');
  }

  const isValidSignature = razorpayService.verifyPaymentSignature({
    razorpayOrderId: parsed.data.razorpay_order_id,
    razorpayPaymentId: parsed.data.razorpay_payment_id,
    razorpaySignature: parsed.data.razorpay_signature,
  });
  if (!isValidSignature) {
    throw new ApiError(400, 'Invalid Razorpay payment signature');
  }

  const [razorpayOrder, razorpayPayment] = await Promise.all([
    razorpayService.fetchOrder(parsed.data.razorpay_order_id),
    razorpayService.fetchPayment(parsed.data.razorpay_payment_id),
  ]);

  if (razorpayOrder.amount !== checkoutPayload.amountInPaise || razorpayOrder.currency !== checkoutPayload.currency) {
    throw new ApiError(400, 'Razorpay order amount mismatch');
  }
  if (razorpayPayment.order_id !== parsed.data.razorpay_order_id) {
    throw new ApiError(400, 'Razorpay payment/order mismatch');
  }
  if (razorpayPayment.status !== 'captured' && razorpayPayment.status !== 'authorized') {
    throw new ApiError(400, 'Razorpay payment is not successful');
  }

  const orderId = await finalizeSuccessfulRazorpayCheckout(
    {
      consumerId: checkoutPayload.consumerId,
      farmerId: checkoutPayload.farmerId,
      deliveryAddress: checkoutPayload.deliveryAddress,
      items: checkoutPayload.items,
    },
    parsed.data.razorpay_order_id,
    parsed.data.razorpay_payment_id,
  );

  res.status(200).json({
    success: true,
    data: {
      status: 'paid',
      orderId,
      paymentStatus: 'paid',
    },
  });
});

export const handleRazorpayWebhook = asyncHandler(async (req: Request, res: Response) => {
  if (!razorpayService.isConfigured() || !razorpayService.hasWebhookSecret()) {
    throw new ApiError(400, 'Razorpay webhook is not configured');
  }

  const signature = req.headers['x-razorpay-signature'];
  if (typeof signature !== 'string') {
    throw new ApiError(400, 'Missing Razorpay signature');
  }
  if (!req.rawBody) {
    throw new ApiError(400, 'Missing raw request body for webhook verification');
  }

  const isValidSignature = razorpayService.verifyWebhookSignature(req.rawBody, signature);
  if (!isValidSignature) {
    throw new ApiError(400, 'Invalid Razorpay webhook signature');
  }

  const parsed = razorpayWebhookEventSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, 'Invalid Razorpay webhook payload');
  }

  const eventName = parsed.data.event;
  if (eventName === 'payment.captured') {
    const paymentEntity = parsed.data.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;
    if (orderId) {
      const existingOrder = await OrderModel.findOne({ checkoutSessionId: orderId }).select('_id').lean();
      if (!existingOrder) {
        res.status(202).json({
          received: true,
          status: 'accepted',
          message: 'Payment captured. Awaiting client verification callback for order finalization.',
        });
        return;
      }
    }
  }

  res.status(200).json({ received: true });
});

export const handleStripeWebhook = asyncHandler(async (req: Request, res: Response) => {
  if (!stripeService.isConfigured() || !stripeService.hasWebhookSecret()) {
    throw new ApiError(400, 'Stripe webhook is not configured');
  }

  const signature = req.headers['stripe-signature'];
  if (typeof signature !== 'string') {
    throw new ApiError(400, 'Missing Stripe signature');
  }
  if (!req.rawBody) {
    throw new ApiError(400, 'Missing raw request body for webhook verification');
  }

  const event = stripeService.constructEvent(req.rawBody, signature);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    await finalizeSuccessfulCheckout(session);
  }

  res.status(200).json({ received: true });
});

export const getCheckoutSessionStatus = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const sessionId = req.params.sessionId;
  if (!sessionId) {
    throw new ApiError(400, 'sessionId is required');
  }

  const order = await OrderModel.findOne({ checkoutSessionId: sessionId, consumerId: ensureObjectId(req.user.id, 'consumer id') }).lean();
  if (order) {
    res.status(200).json({
      success: true,
      data: {
        status: 'paid',
        orderId: String(order._id),
        paymentStatus: order.paymentStatus ?? 'paid',
      },
    });
    return;
  }

  const session = await stripeService.retrieveCheckoutSession(sessionId);
  res.status(200).json({
    success: true,
    data: {
      status: session.payment_status === 'paid' ? 'processing' : session.payment_status || 'pending',
      orderId: null,
      paymentStatus: session.payment_status || 'pending',
    },
  });
});
