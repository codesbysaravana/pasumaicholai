import { UserModel } from '../models/user.model.js';

export interface ExpertProfile {
  id: string;
  name: string;
  specialization: string;
  email: string;
  phone: string | null;
  status: 'active' | 'busy' | 'offline';
}

export async function getExperts(): Promise<ExpertProfile[]> {
  const experts = await UserModel.find({ role: 'expert' })
    .select('_id fullName email phone specialization status')
    .sort({ createdAt: -1 })
    .lean();

  return experts.map((expert) => ({
    id: String(expert._id),
    name: expert.fullName,
    email: expert.email,
    specialization: (expert as any).specialization ?? 'Agriculture Expert',
    phone: (expert as any).phone ?? null,
    status: ((expert as any).status as 'active' | 'busy' | 'offline' | undefined) ?? 'active',
  }));
}

export async function getExpertById(expertId: string): Promise<ExpertProfile | null> {
  const expert = await UserModel.findOne({ _id: expertId, role: 'expert' })
    .select('_id fullName email phone specialization status')
    .lean();
  if (!expert) {
    return null;
  }

  return {
    id: String(expert._id),
    name: expert.fullName,
    email: expert.email,
    specialization: (expert as any).specialization ?? 'Agriculture Expert',
    phone: (expert as any).phone ?? null,
    status: ((expert as any).status as 'active' | 'busy' | 'offline' | undefined) ?? 'active',
  };
}
