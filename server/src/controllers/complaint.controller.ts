import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { ComplaintModel, type ComplaintStatus } from '../models/complaint.model.js';
import { UserModel } from '../models/user.model.js';
import { WardModel } from '../models/ward.model.js';
import { chatbotService } from '../modules/chatbot/chatbot.service.js';
import { uploadComplaintAttachment } from '../services/s3Service.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';

const complaintTypeValues = [
  'Water Supply',
  'Electricity',
  'Crop Disease',
  'Pest Issue',
  'Subsidy Issue',
  'Market Price Issue',
  'Other',
] as const;

const createComplaintSchema = z.object({
  farmerLocation: z.string().min(2),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  ward: z.string().trim().min(1).optional(),
  city: z.string().trim().min(1).optional(),
  state: z.string().trim().min(1).optional(),
  complaintType: z.enum(complaintTypeValues),
  description: z.string().min(10),
});

const complaintTtsSchema = z.object({
  text: z.string().min(1).max(1200),
});

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'ONGOING', 'COMPLETED']),
});

const idParamsSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid complaint identifier'),
});

const ESCALATION_WINDOW_MS = 20 * 60 * 60 * 1000;

type ComplaintLeanRecord = Record<string, unknown> & {
  _id: mongoose.Types.ObjectId | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

type FarmerSnapshot = {
  _id: mongoose.Types.ObjectId;
  fullName: string;
  phone?: string | null;
  mobile?: string | null;
  wardId?: string | null;
  wardName?: string | null;
  talukName?: string | null;
  district?: string | null;
};

type WardSnapshot = {
  wardId: string;
  wardName: string;
  talukName: string;
  districtName: string;
};

function toComplaintResponse(item: Record<string, unknown>) {
  const record = item as ComplaintLeanRecord;
  const id = String(record._id);
  return {
    ...item,
    id,
    complaintId: id,
    lastUpdated: record.updatedAt ? new Date(record.updatedAt).toISOString() : new Date().toISOString(),
  };
}

function normalizeTranscript(transcript: string): string {
  const cleaned = transcript
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .trim();

  if (!cleaned) {
    return '';
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

async function resolveTalukAdminId(farmerTalukName: string | null | undefined, farmerLocation: string): Promise<string | null> {
  if (farmerTalukName) {
    const matchByTaluk = await UserModel.findOne({
      role: 'taluk_admin',
      talukName: { $regex: new RegExp(`^${farmerTalukName}$`, 'i') },
    })
      .select('_id')
      .lean();
    if (matchByTaluk?._id) {
      return String(matchByTaluk._id);
    }
  }

  const matchByLocation = await UserModel.findOne({
    role: 'taluk_admin',
    talukName: { $regex: new RegExp(farmerLocation, 'i') },
  })
    .select('_id')
    .lean();

  if (matchByLocation?._id) {
    return String(matchByLocation._id);
  }

  const fallback = await UserModel.findOne({ role: 'taluk_admin' }).select('_id').sort({ createdAt: 1 }).lean();
  if (fallback?._id) {
    return String(fallback._id);
  }

  return null;
}

function cleanText(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

async function resolveWardByContext(params: {
  farmerWardId?: string | null;
  farmerWardName?: string | null;
  farmerTalukName?: string | null;
  farmerDistrict?: string | null;
  geocodedWard?: string | null;
  geocodedCity?: string | null;
  geocodedState?: string | null;
  farmerLocation: string;
}): Promise<WardSnapshot | null> {
  const farmerWardId = cleanText(params.farmerWardId);
  if (farmerWardId) {
    const byId = await WardModel.findOne({ wardId: farmerWardId })
      .select('wardId wardName talukName districtName')
      .lean();
    if (byId) {
      return byId as WardSnapshot;
    }
  }

  const nameHints = [params.farmerWardName, params.geocodedWard, params.farmerLocation]
    .map((value) => cleanText(value))
    .filter(Boolean);
  for (const hint of nameHints) {
    const escaped = hint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const byName = await WardModel.findOne({
      $or: [
        { wardName: { $regex: new RegExp(`^${escaped}$`, 'i') } },
        { aliases: { $elemMatch: { $regex: new RegExp(`^${escaped}$`, 'i') } } },
      ],
    })
      .select('wardId wardName talukName districtName')
      .lean();
    if (byName) {
      return byName as WardSnapshot;
    }
  }

  const farmerTalukName = cleanText(params.farmerTalukName);
  const farmerDistrict = cleanText(params.farmerDistrict);
  if (farmerTalukName && farmerDistrict) {
    const byTalukAndDistrict = await WardModel.findOne({
      talukName: { $regex: new RegExp(`^${farmerTalukName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      districtName: { $regex: new RegExp(`^${farmerDistrict.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    })
      .sort({ wardNumber: 1 })
      .select('wardId wardName talukName districtName')
      .lean();
    if (byTalukAndDistrict) {
      return byTalukAndDistrict as WardSnapshot;
    }
  }

  const geocodedCity = cleanText(params.geocodedCity);
  if (geocodedCity) {
    const byTalukMatch = await WardModel.findOne({
      talukName: { $regex: new RegExp(geocodedCity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
    })
      .sort({ wardNumber: 1 })
      .select('wardId wardName talukName districtName')
      .lean();
    if (byTalukMatch) {
      return byTalukMatch as WardSnapshot;
    }
  }

  const geocodedState = cleanText(params.geocodedState);
  if (geocodedState) {
    const byDistrictMatch = await WardModel.findOne({
      districtName: { $regex: new RegExp(geocodedState.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
    })
      .sort({ wardNumber: 1 })
      .select('wardId wardName talukName districtName')
      .lean();
    if (byDistrictMatch) {
      return byDistrictMatch as WardSnapshot;
    }
  }

  return null;
}

async function applyEscalationForOverdueComplaints(): Promise<void> {
  const threshold = new Date(Date.now() - ESCALATION_WINDOW_MS);
  await ComplaintModel.updateMany(
    {
      status: { $ne: 'COMPLETED' },
      escalated: { $ne: true },
      createdAt: { $lte: threshold },
    },
    {
      $set: {
        escalated: true,
        escalatedAt: new Date(),
      },
    },
  );
}

export const createComplaint = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const parsed = createComplaintSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? 'Invalid complaint payload');
  }

  const farmer = await UserModel.findOne({ _id: req.user.id, role: 'farmer' })
    .select('_id fullName phone talukName')
    .lean();
  if (!farmer) {
    throw new ApiError(404, 'Farmer profile not found');
  }

  const resolvedWard = await resolveWardByContext({
    farmerWardId: farmer.wardId,
    farmerWardName: farmer.wardName,
    farmerTalukName: farmer.talukName,
    farmerDistrict: farmer.district,
    geocodedWard: parsed.data.ward,
    geocodedCity: parsed.data.city,
    geocodedState: parsed.data.state,
    farmerLocation: parsed.data.farmerLocation,
  });

  let talukAdminId: string | null = null;
  if (resolvedWard?.wardId) {
    const assignedAdmin = await UserModel.findOne({
      role: 'taluk_admin',
      assignedWardId: resolvedWard.wardId,
    })
      .select('_id')
      .lean();
    if (assignedAdmin?._id) {
      talukAdminId = String(assignedAdmin._id);
    }
  }
  if (!talukAdminId) {
    talukAdminId = await resolveTalukAdminId(farmer.talukName, parsed.data.farmerLocation);
  }
  if (!talukAdminId) {
    throw new ApiError(400, 'No Taluk Admin is currently available for this ward');
  }

  let attachmentUrl: string | undefined;
  if (req.file) {
    const uploaded = await uploadComplaintAttachment(
      req.file.buffer,
      String(req.user.id),
      req.file.mimetype || 'application/octet-stream',
      req.file.originalname,
    );
    attachmentUrl = uploaded.url;
  }

  const complaintPayload: {
    farmerId: mongoose.Types.ObjectId;
    farmerName: string;
    farmerPhone: string;
    farmerLocation: string;
    talukAdminId: mongoose.Types.ObjectId;
    complaintType: (typeof complaintTypeValues)[number];
    description: string;
    status: ComplaintStatus;
    wardId: string;
    talukId: string;
    resolvedAt: Date | null;
    escalated: boolean;
    escalatedAt: Date | null;
    latitude?: number;
    longitude?: number;
    ward?: string;
    wardName?: string;
    city?: string;
    state?: string;
    talukName?: string;
    attachmentUrl?: string;
  } = {
    farmerId: farmer._id,
    farmerName: farmer.fullName,
    farmerPhone: farmer.phone ?? '',
    farmerLocation: parsed.data.farmerLocation,
    talukAdminId: new mongoose.Types.ObjectId(talukAdminId),
    complaintType: parsed.data.complaintType,
    description: parsed.data.description,
    status: 'PENDING' as ComplaintStatus,
    wardId: resolvedWard?.wardId || cleanText(parsed.data.ward) || cleanText(farmer.wardId) || cleanText(parsed.data.farmerLocation),
    talukId: resolvedWard?.talukName ?? cleanText(farmer.talukName),
    resolvedAt: null,
    escalated: false,
    escalatedAt: null,
  };
  if (resolvedWard?.wardName) {
    complaintPayload.wardName = resolvedWard.wardName;
  }
  if (resolvedWard?.talukName) {
    complaintPayload.talukName = resolvedWard.talukName;
  }
  if (typeof parsed.data.latitude === 'number') {
    complaintPayload.latitude = parsed.data.latitude;
  }
  if (typeof parsed.data.longitude === 'number') {
    complaintPayload.longitude = parsed.data.longitude;
  }
  if (parsed.data.ward) {
    complaintPayload.ward = parsed.data.ward;
  } else if (resolvedWard?.wardName) {
    complaintPayload.ward = resolvedWard.wardName;
  }
  if (parsed.data.city) {
    complaintPayload.city = parsed.data.city;
  }
  if (parsed.data.state) {
    complaintPayload.state = parsed.data.state;
  }
  if (attachmentUrl) {
    complaintPayload.attachmentUrl = attachmentUrl;
  }

  const complaint = await ComplaintModel.create(complaintPayload);

  res.status(201).json({
    success: true,
    data: toComplaintResponse(complaint.toObject() as Record<string, unknown>),
  });
});

export const transcribeComplaintVoice = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const audio = req.file;
  if (!audio) {
    throw new ApiError(400, 'Audio file is required');
  }

  if (!audio.mimetype.startsWith('audio/')) {
    throw new ApiError(400, 'Only audio files are supported');
  }

  const maxSizeBytes = 10 * 1024 * 1024;
  if (audio.size > maxSizeBytes) {
    throw new ApiError(400, 'Audio file is too large. Maximum allowed is 10MB');
  }

  const audioBase64 = audio.buffer.toString('base64');
  const normalizedMimeType = (audio.mimetype || 'audio/webm').split(';')[0]?.trim() || 'audio/webm';
  let result: { transcript: string };
  try {
    result = await chatbotService.voiceToText(audioBase64, normalizedMimeType);
  } catch {
    throw new ApiError(503, 'Voice transcription service is temporarily unavailable. Please try again or type manually.');
  }
  const transcript = normalizeTranscript(result.transcript);

  if (!transcript) {
    throw new ApiError(422, 'Unable to transcribe voice clearly. Please try again in a quieter environment.');
  }

  res.status(200).json({
    success: true,
    data: {
      transcript,
    },
  });
});

export const complaintTextToSpeech = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const parsed = complaintTtsSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? 'Text is required');
  }

  let result: { audioBase64: string; audioMimeType: string };
  try {
    result = await chatbotService.textToSpeech(parsed.data.text.trim());
  } catch {
    throw new ApiError(503, 'Text-to-speech service is temporarily unavailable. Please try again.');
  }

  res.status(200).json({
    success: true,
    data: result,
  });
});

export const getFarmerComplaints = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  await applyEscalationForOverdueComplaints();
  const complaints = await ComplaintModel.find({ farmerId: req.user.id }).sort({ createdAt: -1 }).lean();
  res.status(200).json({
    success: true,
    data: complaints.map((item) => toComplaintResponse(item)),
  });
});

export const getTalukComplaints = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  await applyEscalationForOverdueComplaints();
  const talukAdmin = await UserModel.findOne({ _id: req.user.id, role: 'taluk_admin' })
    .select('_id assignedWardId')
    .lean();
  if (!talukAdmin) {
    throw new ApiError(404, 'Taluk Admin profile not found');
  }

  const assignedWardId = cleanText((talukAdmin as { assignedWardId?: string | null }).assignedWardId);
  const query = assignedWardId ? { wardId: assignedWardId } : { talukAdminId: req.user.id };
  const complaints = await ComplaintModel.find(query).sort({ createdAt: -1 }).lean();
  res.status(200).json({
    success: true,
    data: complaints.map((item) => toComplaintResponse(item)),
  });
});

export const updateComplaintStatus = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const params = idParamsSchema.safeParse(req.params);
  if (!params.success) {
    throw new ApiError(400, params.error.issues[0]?.message ?? 'Invalid complaint identifier');
  }

  const body = updateStatusSchema.safeParse(req.body);
  if (!body.success) {
    throw new ApiError(400, body.error.issues[0]?.message ?? 'Invalid complaint status payload');
  }

  const complaint = await ComplaintModel.findOneAndUpdate(
    { _id: params.data.id, talukAdminId: req.user.id },
    { status: body.data.status },
    { new: true },
  ).lean();

  if (!complaint) {
    throw new ApiError(404, 'Complaint not found');
  }

  const nextStatus = body.data.status;
  const currentStatus = existing.status;
  const isValidTransition =
    currentStatus === nextStatus ||
    (currentStatus === 'PENDING' && nextStatus === 'ONGOING') ||
    (currentStatus === 'ONGOING' && nextStatus === 'COMPLETED');

  if (!isValidTransition) {
    throw new ApiError(400, `Invalid transition from ${currentStatus} to ${nextStatus}`);
  }

  existing.status = nextStatus;
  existing.resolvedAt = nextStatus === 'COMPLETED' ? existing.resolvedAt ?? new Date() : null;
  await existing.save();

  res.status(200).json({
    success: true,
    data: toComplaintResponse(existing.toObject() as Record<string, unknown>),
  });
});

export const getEscalatedComplaints = asyncHandler(async (_req: Request, res: Response) => {
  await applyEscalationForOverdueComplaints();

  const complaints = await ComplaintModel.find({ escalated: true })
    .populate('talukAdminId', 'fullName email talukName')
    .sort({ escalatedAt: -1, createdAt: -1 })
    .lean();

  const data = complaints.map((item) => {
    const createdAt = new Date(item.createdAt);
    const hoursPending = Math.max(0, Number(((Date.now() - createdAt.getTime()) / (60 * 60 * 1000)).toFixed(1)));
    const talukAdmin =
      item.talukAdminId && typeof item.talukAdminId === 'object'
        ? (item.talukAdminId as { fullName?: string; email?: string })
        : null;

    return {
      ...toComplaintResponse(item),
      hoursPending,
      assignedWardAdmin: talukAdmin?.fullName ?? talukAdmin?.email ?? 'Unassigned',
    };
  });

  res.status(200).json({
    success: true,
    data,
  });
});
