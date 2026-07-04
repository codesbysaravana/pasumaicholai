import type { Request, Response } from 'express';
import { z } from 'zod';
import { GrievanceModel } from '../models/grievance.model.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';

const createGrievanceSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(20),
  category: z.string().min(3),
});

export const createGrievance = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createGrievanceSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? 'Invalid grievance payload');
  }

  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const grievance = await GrievanceModel.create({
    ...parsed.data,
    raisedBy: req.user.id,
  });

  res.status(201).json({
    success: true,
    message: 'Grievance submitted successfully',
    data: {
      ...grievance.toObject(),
      id: String(grievance._id),
    },
  });
});

export const getMyGrievances = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const grievances = await GrievanceModel.find({ raisedBy: req.user.id })
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    data: grievances.map((grievance) => ({
      ...grievance,
      id: String(grievance._id),
    })),
  });
});

export const getGrievanceById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const grievance = await GrievanceModel.findOne({
    _id: req.params.grievanceId,
    raisedBy: req.user.id,
  }).lean();

  if (!grievance) {
    throw new ApiError(404, 'Grievance not found');
  }

  res.status(200).json({
    success: true,
    data: {
      ...grievance,
      id: String(grievance._id),
    },
  });
});
