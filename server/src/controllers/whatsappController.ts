import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { ComplaintModel, type ComplaintStatus } from '../models/complaint.model.js';
import { UserModel } from '../models/user.model.js';
import { WardModel } from '../models/ward.model.js';
import { parseTwilioWebhook, extractComplaint } from '../services/whatsappService.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';

type FarmerSnapshot = {
  _id: mongoose.Types.ObjectId;
  fullName: string;
  phone?: string | null;
  mobile?: string | null;
  wardId?: string | null;
  wardName?: string | null;
  talukName?: string | null;
  district?: string | null;
  city?: string | null;
};

type WardSnapshot = {
  wardId: string;
  wardName: string;
  talukName: string;
  districtName: string;
};

function cleanText(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

function phoneVariants(input: string): string[] {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, '');
  const lastTen = digits.length >= 10 ? digits.slice(-10) : digits;

  const variants = new Set<string>();
  if (trimmed) variants.add(trimmed);
  if (digits) variants.add(digits);
  if (lastTen) variants.add(lastTen);
  if (lastTen) variants.add(`+91${lastTen}`);

  return Array.from(variants);
}

async function resolveWardFromFarmer(farmer: FarmerSnapshot): Promise<WardSnapshot | null> {
  const farmerWardId = cleanText(farmer.wardId);
  if (farmerWardId) {
    const byId = await WardModel.findOne({ wardId: farmerWardId }).select('wardId wardName talukName districtName').lean();
    if (byId) {
      return byId as WardSnapshot;
    }
  }

  const farmerWardName = cleanText(farmer.wardName);
  if (farmerWardName) {
    const escaped = farmerWardName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const byName = await WardModel.findOne({
      $or: [{ wardName: { $regex: new RegExp(`^${escaped}$`, 'i') } }, { aliases: { $elemMatch: { $regex: new RegExp(`^${escaped}$`, 'i') } } }],
    })
      .select('wardId wardName talukName districtName')
      .lean();
    if (byName) {
      return byName as WardSnapshot;
    }
  }

  const farmerTalukName = cleanText(farmer.talukName);
  const farmerDistrict = cleanText(farmer.district);
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

  return null;
}

async function resolveTalukAdminId(farmerTalukName: string | null | undefined, fallbackLocation: string): Promise<string | null> {
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

  if (fallbackLocation) {
    const matchByLocation = await UserModel.findOne({
      role: 'taluk_admin',
      talukName: { $regex: new RegExp(fallbackLocation, 'i') },
    })
      .select('_id')
      .lean();
    if (matchByLocation?._id) {
      return String(matchByLocation._id);
    }
  }

  const fallback = await UserModel.findOne({ role: 'taluk_admin' }).select('_id').sort({ createdAt: 1 }).lean();
  if (fallback?._id) {
    return String(fallback._id);
  }
  return null;
}

function complaintLocationFromFarmer(farmer: FarmerSnapshot): string {
  return cleanText(farmer.wardName) || cleanText(farmer.city) || cleanText(farmer.talukName) || cleanText(farmer.district) || 'Unknown';
}

export const handleWhatsappGrievance = asyncHandler(async (req: Request, res: Response) => {
  const parsedWebhook = parseTwilioWebhook(req.body as Record<string, unknown>);
  const complaintInput = extractComplaint(parsedWebhook);

  if (!complaintInput.phoneNumber) {
    throw new ApiError(400, 'Missing sender phone number in webhook payload');
  }
  if (!complaintInput.messageText || complaintInput.messageText.length < 5) {
    throw new ApiError(400, 'Complaint message is required');
  }

  const variants = phoneVariants(complaintInput.phoneNumber);
  const exactPhoneRegex = variants.map((v) => new RegExp(`^${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
  const lastTen = complaintInput.phoneNumber.replace(/\D/g, '').slice(-10);

  const farmer = await UserModel.findOne({
    role: 'farmer',
    $or: [
      { phone: { $in: exactPhoneRegex } },
      { mobile: { $in: exactPhoneRegex } },
      ...(lastTen ? [{ phone: { $regex: new RegExp(`${lastTen}$`) } }, { mobile: { $regex: new RegExp(`${lastTen}$`) } }] : []),
    ],
  })
    .select('_id fullName phone mobile wardId wardName talukName district city')
    .lean();

  if (!farmer?._id) {
    throw new ApiError(404, 'Farmer not found for WhatsApp number');
  }

  const resolvedWard = await resolveWardFromFarmer(farmer as FarmerSnapshot);

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
    talukAdminId = await resolveTalukAdminId(cleanText(farmer.talukName), complaintLocationFromFarmer(farmer as FarmerSnapshot));
  }
  if (!talukAdminId) {
    throw new ApiError(400, 'No Taluk Admin is currently available for this farmer');
  }

  const payload = {
    farmerId: farmer._id as mongoose.Types.ObjectId,
    farmerName: cleanText(farmer.fullName) || parsedWebhook.profileName || 'WhatsApp Farmer',
    farmerPhone: complaintInput.phoneNumber,
    farmerLocation: complaintLocationFromFarmer(farmer as FarmerSnapshot),
    talukAdminId: new mongoose.Types.ObjectId(talukAdminId),
    complaintType: 'Other',
    description: complaintInput.messageText,
    status: 'PENDING' as ComplaintStatus,
    wardId: resolvedWard?.wardId || cleanText(farmer.wardId),
    talukId: resolvedWard?.talukName || cleanText(farmer.talukName),
    ward: resolvedWard?.wardName || cleanText(farmer.wardName),
    wardName: resolvedWard?.wardName || cleanText(farmer.wardName),
    talukName: resolvedWard?.talukName || cleanText(farmer.talukName),
    city: cleanText(farmer.city),
    source: 'whatsapp',
    phoneNumber: complaintInput.phoneNumber,
    message: complaintInput.messageText,
    createdAt: new Date(complaintInput.timestamp),
  };

  await ComplaintModel.create(payload);

  res.status(200).json({
    success: true,
    message: 'WhatsApp grievance received',
  });
});
