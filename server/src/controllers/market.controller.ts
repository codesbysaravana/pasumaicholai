import type { Request, Response } from 'express';
import { z } from 'zod';
import { ProductModel } from '../models/product.model.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';

const createProductSchema = z.object({
  name: z.string().min(2),
  cropType: z.string().min(2),
  pricePerKg: z.number().positive(),
  quantityKg: z.number().positive(),
  location: z.string().min(2),
  description: z.string().min(10),
});

export const getProducts = asyncHandler(async (_req: Request, res: Response) => {
  const products = await ProductModel.find().sort({ createdAt: -1 }).lean();

  res.status(200).json({
    success: true,
    data: products.map((product) => ({
      ...product,
      id: String(product._id),
    })),
  });
});

export const getProductById = asyncHandler(async (req: Request, res: Response) => {
  const product = await ProductModel.findById(req.params.productId).lean();
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  res.status(200).json({
    success: true,
    data: {
      ...product,
      id: String(product._id),
    },
  });
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createProductSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? 'Invalid product payload');
  }

  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const product = await ProductModel.create({
    ...parsed.data,
    sellerId: req.user.id,
  });

  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: {
      ...product.toObject(),
      id: String(product._id),
    },
  });
});

export const getMyProducts = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const products = await ProductModel.find({ sellerId: req.user.id })
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    data: products.map((product) => ({
      ...product,
      id: String(product._id),
    })),
  });
});
