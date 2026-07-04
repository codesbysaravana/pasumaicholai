import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/async-handler.js';
import {
  createTalukAdminUser,
  deleteTalukAdminUser,
  listTalukAdminUsers,
  updateTalukAdminUser,
} from '../services/taluk-admin.service.js';
import { ApiError } from '../utils/api-error.js';

const createSchema = z.object({
  username: z.string().email('Username must be a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  talukName: z.string().min(2, 'Taluk name is required'),
  assignedWardId: z.string().trim().min(1).optional(),
  assignedWardName: z.string().trim().min(1).optional(),
});

const updateSchema = z.object({
  username: z.string().email('Username must be a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  talukName: z.string().min(2, 'Taluk name is required'),
  assignedWardId: z.string().trim().min(1).optional(),
  assignedWardName: z.string().trim().min(1).optional(),
});

const paramsSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid taluk admin identifier'),
});

export const createTalukAdmin = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? 'Invalid payload');
  }

  const created = await createTalukAdminUser(parsed.data);
  res.status(201).json({
    success: true,
    data: created,
  });
});

export const getTalukAdmins = asyncHandler(async (_req: Request, res: Response) => {
  const records = await listTalukAdminUsers();
  res.status(200).json({
    success: true,
    data: records,
  });
});

export const updateTalukAdmin = asyncHandler(async (req: Request, res: Response) => {
  const params = paramsSchema.safeParse(req.params);
  if (!params.success) {
    throw new ApiError(400, params.error.issues[0]?.message ?? 'Invalid identifier');
  }

  const body = updateSchema.safeParse(req.body);
  if (!body.success) {
    throw new ApiError(400, body.error.issues[0]?.message ?? 'Invalid payload');
  }

  const updateInput: {
    username: string;
    talukName: string;
    password?: string;
    assignedWardId?: string;
    assignedWardName?: string;
  } = {
    username: body.data.username,
    talukName: body.data.talukName,
  };
  if (body.data.assignedWardId) {
    updateInput.assignedWardId = body.data.assignedWardId;
  }
  if (body.data.assignedWardName) {
    updateInput.assignedWardName = body.data.assignedWardName;
  }
  if (body.data.password) {
    updateInput.password = body.data.password;
  }

  const updated = await updateTalukAdminUser(params.data.id, updateInput);
  res.status(200).json({
    success: true,
    data: updated,
  });
});

export const deleteTalukAdmin = asyncHandler(async (req: Request, res: Response) => {
  const params = paramsSchema.safeParse(req.params);
  if (!params.success) {
    throw new ApiError(400, params.error.issues[0]?.message ?? 'Invalid identifier');
  }

  await deleteTalukAdminUser(params.data.id);
  res.status(200).json({
    success: true,
    data: { deleted: true },
  });
});
