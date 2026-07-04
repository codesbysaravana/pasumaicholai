import type { Request, Response } from 'express';
import { z } from 'zod';
import { SchemeModel } from '../models/scheme.model.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';

const createSchemeSchema = z.object({
  title: z.string().min(4),
  summary: z.string().min(10),
  eligibility: z.string().min(5),
});

export const getSchemes = asyncHandler(async (_req: Request, res: Response) => {
  const schemes = await SchemeModel.find().sort({ createdAt: -1 }).lean();

  res.status(200).json({
    success: true,
    data: schemes.map((scheme) => ({
      ...scheme,
      id: String(scheme._id),
    })),
  });
});

export const getSchemeById = asyncHandler(async (req: Request, res: Response) => {
  const scheme = await SchemeModel.findById(req.params.schemeId).lean();
  if (!scheme) {
    throw new ApiError(404, 'Scheme not found');
  }

  res.status(200).json({
    success: true,
    data: {
      ...scheme,
      id: String(scheme._id),
    },
  });
});

export const createScheme = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createSchemeSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? 'Invalid scheme payload');
  }

  const scheme = await SchemeModel.create(parsed.data);

  res.status(201).json({
    success: true,
    message: 'Scheme created successfully',
    data: {
      ...scheme.toObject(),
      id: String(scheme._id),
    },
  });
});

export const upvoteScheme = asyncHandler(async (req: Request, res: Response) => {
  const scheme = await SchemeModel.findByIdAndUpdate(
    req.params.schemeId,
    { $inc: { upvotes: 1 } },
    { returnDocument: 'after' },
  ).lean();

  if (!scheme) {
    throw new ApiError(404, 'Scheme not found');
  }

  res.status(200).json({
    success: true,
    message: 'Scheme upvoted successfully',
    data: {
      ...scheme,
      id: String(scheme._id),
    },
  });
});
