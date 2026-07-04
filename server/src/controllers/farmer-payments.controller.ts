import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { OrderModel } from '../models/order.model.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';

const markSeenSchema = z.object({
  notificationIds: z.array(z.string().min(1)).max(50).optional(),
});

function ensureObjectId(value: string, label: string): mongoose.Types.ObjectId {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `Invalid ${label}`);
  }
  return new mongoose.Types.ObjectId(value);
}

export const getFarmerPayments = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const farmerId = ensureObjectId(req.user.id, 'farmer id');
  const orders = await OrderModel.find({ farmerId, paymentStatus: 'paid' })
    .sort({ paidAt: -1, createdAt: -1 })
    .populate('consumerId', 'fullName')
    .lean();

  res.status(200).json({
    success: true,
    data: orders.map((order) => ({
      id: String(order._id),
      productName: order.productName ?? 'Product',
      buyerName: (order.consumerId as { fullName?: string } | undefined)?.fullName ?? 'Consumer',
      amount: order.totalPrice,
      paidAt: order.paidAt ? order.paidAt.toISOString() : order.createdAt.toISOString(),
      paymentStatus: order.paymentStatus ?? 'paid',
    })),
  });
});

export const getFarmerPaymentNotifications = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const farmerId = ensureObjectId(req.user.id, 'farmer id');
  const orders = await OrderModel.find({ farmerId, paymentStatus: 'paid', farmerNotified: false })
    .sort({ paidAt: -1, createdAt: -1 })
    .limit(10)
    .populate('consumerId', 'fullName')
    .lean();

  res.status(200).json({
    success: true,
    data: orders.map((order) => {
      const productName = order.productName ?? 'Product';
      return {
        id: String(order._id),
        productName,
        buyerName: (order.consumerId as { fullName?: string } | undefined)?.fullName ?? 'Consumer',
        amount: order.totalPrice,
        paidAt: order.paidAt ? order.paidAt.toISOString() : order.createdAt.toISOString(),
        paymentStatus: order.paymentStatus ?? 'paid',
        message: `Your product "${productName}" has been purchased successfully.`,
      };
    }),
  });
});

export const markFarmerPaymentNotificationsSeen = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const parsed = markSeenSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? 'Invalid payload');
  }

  const farmerId = ensureObjectId(req.user.id, 'farmer id');
  const filter: Record<string, unknown> = {
    farmerId,
    paymentStatus: 'paid',
    farmerNotified: false,
  };

  if (parsed.data.notificationIds && parsed.data.notificationIds.length > 0) {
    filter._id = {
      $in: parsed.data.notificationIds.map((id) => ensureObjectId(id, 'notification id')),
    };
  }

  const result = await OrderModel.updateMany(filter, {
    $set: { farmerNotified: true },
  });

  res.status(200).json({
    success: true,
    data: {
      markedCount: result.modifiedCount,
    },
  });
});
