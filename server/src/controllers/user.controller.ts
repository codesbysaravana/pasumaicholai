import type { Request, Response } from 'express';
import { UserModel } from '../models/user.model.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';

export const getUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await UserModel.find().select('-passwordHash').sort({ createdAt: -1 }).lean();

  res.status(200).json({
    success: true,
    data: users.map((user) => ({
      id: String(user._id),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      mobile: (user as any).mobile || (user as any).phone || null,
      specialization: (user as any).specialization ?? null,
      status: (user as any).status ?? 'active',
      talukName: user.talukName ?? null,
    })),
  });
});

export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const user = await UserModel.findById(req.params.userId).select('-passwordHash').lean();
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.status(200).json({
    success: true,
    data: {
      id: String(user._id),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      mobile: (user as any).mobile || (user as any).phone || null,
      specialization: (user as any).specialization ?? null,
      status: (user as any).status ?? 'active',
      talukName: user.talukName ?? null,
    },
  });
});
