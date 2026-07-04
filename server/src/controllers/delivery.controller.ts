import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { OrderModel } from '../models/order.model.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';

const deliveryStatusValues = ['PENDING_PICKUP', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const;

const idParamsSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid order identifier'),
});

const updateDeliveryStatusSchema = z.object({
  deliveryStatus: z.enum(deliveryStatusValues),
});

function ensureObjectId(value: string, label: string): mongoose.Types.ObjectId {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `Invalid ${label}`);
  }
  return new mongoose.Types.ObjectId(value);
}

type LeanEntity = {
  _id?: mongoose.Types.ObjectId | string;
  fullName?: string;
};

function toDeliveryOrderResponse(order: Record<string, unknown>) {
  const farmer = (order.farmerId as LeanEntity | undefined) ?? {};
  const consumer = (order.consumerId as LeanEntity | undefined) ?? {};
  const assigned = (order.assignedDeliveryAgentId as LeanEntity | undefined) ?? {};

  return {
    orderId: String(order._id),
    product: (order.productName as string | undefined) ?? 'Product',
    farmerId: typeof farmer._id === 'undefined' ? String(order.farmerId) : String(farmer._id),
    farmerName: farmer.fullName ?? 'Farmer',
    consumerId: typeof consumer._id === 'undefined' ? String(order.consumerId) : String(consumer._id),
    consumerName: consumer.fullName ?? 'Consumer',
    pickupLocation: (order as { pickupLocation?: string }).pickupLocation ?? 'Farmer location',
    deliveryLocation: (order.deliveryAddress as { location?: string } | undefined)?.location ?? 'Not provided',
    deliveryStatus: (order.deliveryStatus as string | undefined) ?? 'PENDING_PICKUP',
    assignedDeliveryAgentId: assigned._id ? String(assigned._id) : null,
    assignedDeliveryAgentName: assigned.fullName ?? null,
    purchaseTime:
      order.purchaseTime instanceof Date
        ? order.purchaseTime.toISOString()
        : order.createdAt instanceof Date
          ? order.createdAt.toISOString()
          : null,
    pickedUpAt: order.pickedUpAt instanceof Date ? order.pickedUpAt.toISOString() : null,
    outForDeliveryAt: order.outForDeliveryAt instanceof Date ? order.outForDeliveryAt.toISOString() : null,
    deliveredAt: order.deliveredAt instanceof Date ? order.deliveredAt.toISOString() : null,
  };
}

function isValidTransition(current: string, next: string): boolean {
  if (current === next) return true;
  if (current === 'PICKED_UP' && next === 'OUT_FOR_DELIVERY') return true;
  if (current === 'OUT_FOR_DELIVERY' && next === 'DELIVERED') return true;
  return false;
}

export const getAvailableDeliveries = asyncHandler(async (_req: Request, res: Response) => {
  const orders = await OrderModel.find({
    deliveryStatus: 'PENDING_PICKUP',
    $or: [{ assignedDeliveryAgentId: { $exists: false } }, { assignedDeliveryAgentId: null }],
  })
    .sort({ purchaseTime: -1, createdAt: -1 })
    .populate('farmerId', 'fullName')
    .populate('consumerId', 'fullName')
    .lean();

  res.status(200).json({
    success: true,
    data: orders.map((item) => toDeliveryOrderResponse(item)),
  });
});

export const getAssignedDeliveries = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const agentId = ensureObjectId(req.user.id, 'delivery agent id');
  const orders = await OrderModel.find({
    assignedDeliveryAgentId: agentId,
  })
    .sort({ updatedAt: -1, createdAt: -1 })
    .populate('farmerId', 'fullName')
    .populate('consumerId', 'fullName')
    .populate('assignedDeliveryAgentId', 'fullName')
    .lean();

  res.status(200).json({
    success: true,
    data: orders.map((item) => toDeliveryOrderResponse(item)),
  });
});

export const acceptDeliveryJob = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const params = idParamsSchema.safeParse(req.params);
  if (!params.success) {
    throw new ApiError(400, params.error.issues[0]?.message ?? 'Invalid order identifier');
  }

  const agentId = ensureObjectId(req.user.id, 'delivery agent id');
  const updated = await OrderModel.findOneAndUpdate(
    {
      _id: params.data.id,
      deliveryStatus: 'PENDING_PICKUP',
      $or: [{ assignedDeliveryAgentId: { $exists: false } }, { assignedDeliveryAgentId: null }],
    },
    {
      $set: {
        assignedDeliveryAgentId: agentId,
        deliveryStatus: 'PICKED_UP',
        pickedUpAt: new Date(),
      },
    },
    { new: true },
  )
    .populate('farmerId', 'fullName')
    .populate('consumerId', 'fullName')
    .populate('assignedDeliveryAgentId', 'fullName')
    .lean();

  if (!updated) {
    throw new ApiError(409, 'Delivery job is unavailable or already accepted');
  }

  res.status(200).json({
    success: true,
    data: toDeliveryOrderResponse(updated),
  });
});

export const updateAssignedDeliveryStatus = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const params = idParamsSchema.safeParse(req.params);
  if (!params.success) {
    throw new ApiError(400, params.error.issues[0]?.message ?? 'Invalid order identifier');
  }

  const body = updateDeliveryStatusSchema.safeParse(req.body);
  if (!body.success) {
    throw new ApiError(400, body.error.issues[0]?.message ?? 'Invalid delivery status payload');
  }

  const order = await OrderModel.findOne({
    _id: params.data.id,
    assignedDeliveryAgentId: ensureObjectId(req.user.id, 'delivery agent id'),
  });
  if (!order) {
    throw new ApiError(404, 'Assigned delivery order not found');
  }

  const currentStatus = order.deliveryStatus;
  const nextStatus = body.data.deliveryStatus;
  if (!isValidTransition(currentStatus, nextStatus)) {
    throw new ApiError(400, `Invalid transition from ${currentStatus} to ${nextStatus}`);
  }

  order.deliveryStatus = nextStatus;
  if (nextStatus === 'PICKED_UP' && !order.pickedUpAt) order.pickedUpAt = new Date();
  if (nextStatus === 'OUT_FOR_DELIVERY') order.outForDeliveryAt = new Date();
  if (nextStatus === 'DELIVERED') {
    order.deliveredAt = new Date();
    order.orderStatus = 'delivered';
    order.status = 'delivered';
  }
  await order.save();

  const fresh = await OrderModel.findById(order._id)
    .populate('farmerId', 'fullName')
    .populate('consumerId', 'fullName')
    .populate('assignedDeliveryAgentId', 'fullName')
    .lean();

  res.status(200).json({
    success: true,
    data: fresh ? toDeliveryOrderResponse(fresh) : null,
  });
});

export const getConsumerOrderTracking = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const params = idParamsSchema.safeParse(req.params);
  if (!params.success) {
    throw new ApiError(400, params.error.issues[0]?.message ?? 'Invalid order identifier');
  }

  const order = await OrderModel.findOne({
    _id: params.data.id,
    consumerId: ensureObjectId(req.user.id, 'consumer id'),
  })
    .populate('assignedDeliveryAgentId', 'fullName')
    .lean();

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  const assigned = (order.assignedDeliveryAgentId as LeanEntity | undefined) ?? {};
  res.status(200).json({
    success: true,
    data: {
      orderId: String(order._id),
      purchaseStatus: order.purchaseStatus ?? 'BOUGHT',
      purchaseTime: (order.purchaseTime ?? order.createdAt).toISOString(),
      deliveryStatus: order.deliveryStatus ?? 'PENDING_PICKUP',
      pickedUpAt: order.pickedUpAt ? order.pickedUpAt.toISOString() : null,
      outForDeliveryAt: order.outForDeliveryAt ? order.outForDeliveryAt.toISOString() : null,
      deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
      assignedDeliveryAgentId: assigned._id ? String(assigned._id) : null,
      assignedDeliveryAgentName: assigned.fullName ?? null,
    },
  });
});
