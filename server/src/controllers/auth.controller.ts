import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { UserModel } from '../models/user.model.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { clearAuthCookie, setAuthCookie, signAccessToken } from '../utils/auth-token.js';

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['farmer', 'admin', 'taluk_admin', 'expert', 'consumer', 'delivery']),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

function toSafeUser(user: { _id: unknown; fullName: string; email: string; role: string }) {
  return {
    id: String(user._id),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
  };
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? 'Invalid registration payload');
  }

  const { fullName, email, password, role } = parsed.data;
  const existing = await UserModel.findOne({ email }).lean();
  if (existing) {
    throw new ApiError(409, 'User already exists with this email');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await UserModel.create({
    fullName,
    email,
    passwordHash,
    role,
  });

  const token = signAccessToken(String(user._id), user.role);
  setAuthCookie(res, token);

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: toSafeUser(user),
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? 'Invalid login payload');
  }

  const { email, password } = parsed.data;
  const user = await UserModel.findOne({ email });
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = signAccessToken(String(user._id), user.role);
  setAuthCookie(res, token);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: toSafeUser(user),
  });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const user = await UserModel.findById(req.user.id).select('-passwordHash');
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
    },
  });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  clearAuthCookie(res);

  res.status(200).json({
    success: true,
    message: 'Logout successful',
  });
});
