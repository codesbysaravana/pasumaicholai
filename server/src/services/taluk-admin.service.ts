import bcrypt from 'bcryptjs';
import { UserModel } from '../models/user.model.js';
import { WardModel } from '../models/ward.model.js';
import { ApiError } from '../utils/api-error.js';

export interface TalukAdminRecord {
  id: string;
  username: string;
  talukName: string;
  assignedWardId?: string;
  assignedWardName?: string;
  createdAt: string;
}

function toTalukAdminRecord(user: {
  _id: unknown;
  email: string;
  talukName?: string | null;
  assignedWardId?: string | null;
  assignedWardName?: string | null;
  createdAt?: Date | string;
}): TalukAdminRecord {
  return {
    id: String(user._id),
    username: user.email,
    talukName: user.talukName ?? '',
    assignedWardId: user.assignedWardId ?? undefined,
    assignedWardName: user.assignedWardName ?? undefined,
    createdAt: new Date(user.createdAt ?? new Date()).toISOString(),
  };
}

async function resolveWardAssignment(input: {
  talukName: string;
  assignedWardId?: string;
  assignedWardName?: string;
}): Promise<{ assignedWardId?: string; assignedWardName?: string; talukName: string }> {
  const talukName = input.talukName.trim();
  const assignedWardId = input.assignedWardId?.trim();
  const assignedWardName = input.assignedWardName?.trim();

  if (!assignedWardId && !assignedWardName) {
    return { talukName };
  }

  const ward = await WardModel.findOne(
    assignedWardId
      ? { wardId: assignedWardId }
      : {
          wardName: { $regex: new RegExp(`^${(assignedWardName ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        },
  )
    .select('wardId wardName talukName')
    .lean();

  if (!ward) {
    throw new ApiError(400, 'Assigned ward not found in ward mappings');
  }

  return {
    talukName: ward.talukName ?? talukName,
    assignedWardId: ward.wardId,
    assignedWardName: ward.wardName,
  };
}

async function ensureWardUniquenessForTalukAdmin(assignedWardId: string, excludeUserId?: string): Promise<void> {
  const existing = await UserModel.findOne({
    role: 'taluk_admin',
    assignedWardId,
    ...(excludeUserId ? { _id: { $ne: excludeUserId } } : {}),
  })
    .select('_id')
    .lean();
  if (existing?._id) {
    throw new ApiError(409, 'This ward is already assigned to another Taluk Admin');
  }
}

export async function createTalukAdminUser(input: {
  username: string;
  password: string;
  talukName: string;
  assignedWardId?: string;
  assignedWardName?: string;
}): Promise<TalukAdminRecord> {
  const username = input.username.trim().toLowerCase();
  const existing = await UserModel.findOne({ email: username }).lean();
  if (existing) {
    throw new ApiError(409, 'Username already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const wardAssignment = await resolveWardAssignment(input);
  if (wardAssignment.assignedWardId) {
    await ensureWardUniquenessForTalukAdmin(wardAssignment.assignedWardId);
  }

  const user = await UserModel.create({
    fullName: `${wardAssignment.talukName.trim()} Taluk Admin`,
    email: username,
    mobile: `TA-${Date.now()}`,
    dob: '1970-01-01',
    gender: 'unspecified',
    passwordHash,
    aadhaarFull: `TALUK-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    aadhaarLast4: String(Math.floor(1000 + Math.random() * 9000)),
    role: 'taluk_admin',
    talukName: wardAssignment.talukName,
    assignedWardId: wardAssignment.assignedWardId,
    assignedWardName: wardAssignment.assignedWardName,
  });

  return toTalukAdminRecord(user);
}

export async function listTalukAdminUsers(): Promise<TalukAdminRecord[]> {
  const users = await UserModel.find({ role: 'taluk_admin' })
    .select('_id email talukName assignedWardId assignedWardName createdAt')
    .sort({ createdAt: -1 })
    .lean();

  return users.map((user) => toTalukAdminRecord(user));
}

export async function updateTalukAdminUser(
  id: string,
  input: {
    username: string;
    talukName: string;
    password?: string;
    assignedWardId?: string;
    assignedWardName?: string;
  },
): Promise<TalukAdminRecord> {
  const user = await UserModel.findOne({ _id: id, role: 'taluk_admin' });
  if (!user) {
    throw new ApiError(404, 'Taluk Admin not found');
  }

  const username = input.username.trim().toLowerCase();
  if (username !== user.email) {
    const existing = await UserModel.findOne({ email: username, _id: { $ne: id } }).lean();
    if (existing) {
      throw new ApiError(409, 'Username already exists');
    }
  }

  user.email = username;
  const wardAssignment = await resolveWardAssignment(input);
  if (wardAssignment.assignedWardId) {
    await ensureWardUniquenessForTalukAdmin(wardAssignment.assignedWardId, id);
  }

  user.talukName = wardAssignment.talukName;
  user.fullName = `${wardAssignment.talukName.trim()} Taluk Admin`;
  user.assignedWardId = wardAssignment.assignedWardId;
  user.assignedWardName = wardAssignment.assignedWardName;

  if (input.password && input.password.trim().length > 0) {
    user.passwordHash = await bcrypt.hash(input.password, 12);
  }

  await user.save();

  return toTalukAdminRecord(user);
}

export async function deleteTalukAdminUser(id: string): Promise<void> {
  const deleted = await UserModel.findOneAndDelete({ _id: id, role: 'taluk_admin' });
  if (!deleted) {
    throw new ApiError(404, 'Taluk Admin not found');
  }
}
