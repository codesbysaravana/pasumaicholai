/* eslint-disable no-console */
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { ComplaintModel } from '../src/models/complaint.model.js';
import { UserModel } from '../src/models/user.model.js';
import { WardModel } from '../src/models/ward.model.js';

type WardSeed = {
  wardId: string;
  wardNumber: number;
  wardName: string;
  talukName: string;
  districtName: string;
  aliases?: string[];
};

// Update this list with your official ward master data.
const WARD_MAPPINGS: WardSeed[] = [
  {
    wardId: 'MDU-E-014',
    wardNumber: 14,
    wardName: 'Thirumangalam Ward 14',
    talukName: 'Madurai East',
    districtName: 'Madurai',
    aliases: ['Thirumangalam', 'Ward 14'],
  },
  {
    wardId: 'CHN-005-ROY',
    wardNumber: 5,
    wardName: 'Royapuram Ward 5',
    talukName: 'Chennai',
    districtName: 'Chennai',
    aliases: ['Zone 5 Royapuram', 'Royapuram'],
  },
];

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

async function upsertWardMappings(): Promise<void> {
  if (!WARD_MAPPINGS.length) {
    console.log('[ward-mapping] No ward mappings configured.');
    return;
  }

  const operations = WARD_MAPPINGS.map((ward) => ({
    updateOne: {
      filter: { wardId: ward.wardId },
      update: {
        $set: {
          wardNumber: ward.wardNumber,
          wardName: ward.wardName,
          talukName: ward.talukName,
          districtName: ward.districtName,
          aliases: ward.aliases ?? [],
        },
      },
      upsert: true,
    },
  }));

  const result = await WardModel.bulkWrite(operations);
  console.log('[ward-mapping] upsert complete', {
    matched: result.matchedCount,
    modified: result.modifiedCount,
    upserted: result.upsertedCount,
  });
}

async function assignTalukAdminsToWards(): Promise<void> {
  const admins = await UserModel.find({ role: 'taluk_admin' })
    .select('_id email talukName assignedWardId assignedWardName')
    .lean();

  let updated = 0;
  for (const admin of admins) {
    const currentWardId = clean((admin as { assignedWardId?: string }).assignedWardId);
    if (currentWardId) {
      continue;
    }

    const talukName = clean((admin as { talukName?: string }).talukName);
    if (!talukName) {
      continue;
    }

    const ward = await WardModel.findOne({ talukName: { $regex: new RegExp(`^${talukName}$`, 'i') } })
      .sort({ wardNumber: 1 })
      .select('wardId wardName')
      .lean();
    if (!ward) {
      continue;
    }

    const alreadyAssigned = await UserModel.findOne({
      role: 'taluk_admin',
      assignedWardId: ward.wardId,
      _id: { $ne: admin._id },
    })
      .select('_id')
      .lean();
    if (alreadyAssigned?._id) {
      console.warn(`[ward-mapping] ward ${ward.wardId} already assigned; skipping admin ${String(admin._id)}`);
      continue;
    }

    const write = await UserModel.updateOne(
      { _id: admin._id, role: 'taluk_admin' },
      { $set: { assignedWardId: ward.wardId, assignedWardName: ward.wardName } },
    );
    if (write.modifiedCount > 0) {
      updated += 1;
    }
  }

  console.log('[ward-mapping] taluk admin assignments updated', { updated });
}

async function resolveWardForComplaint(params: {
  farmerWardId?: string;
  farmerWardName?: string;
  complaintWardId?: string;
  complaintWardName?: string;
  complaintLocation?: string;
}): Promise<{ wardId: string; wardName: string; talukName: string } | null> {
  const wardIdHints = [params.farmerWardId, params.complaintWardId].map(clean).filter(Boolean);
  for (const wardId of wardIdHints) {
    const byId = await WardModel.findOne({ wardId }).select('wardId wardName talukName').lean();
    if (byId) {
      return { wardId: byId.wardId, wardName: byId.wardName, talukName: byId.talukName };
    }
  }

  const nameHints = [params.farmerWardName, params.complaintWardName, params.complaintLocation].map(clean).filter(Boolean);
  for (const name of nameHints) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const byName = await WardModel.findOne({
      $or: [{ wardName: { $regex: new RegExp(`^${escaped}$`, 'i') } }, { aliases: { $elemMatch: { $regex: new RegExp(`^${escaped}$`, 'i') } } }],
    })
      .select('wardId wardName talukName')
      .lean();
    if (byName) {
      return { wardId: byName.wardId, wardName: byName.wardName, talukName: byName.talukName };
    }
  }

  return null;
}

async function backfillComplaintWardData(): Promise<void> {
  const complaints = await ComplaintModel.find({
    $or: [{ wardId: { $exists: false } }, { wardId: '' }, { wardId: null }],
  })
    .select('_id farmerId wardId wardName ward farmerLocation')
    .lean();

  let updated = 0;
  for (const complaint of complaints) {
    const farmer = await UserModel.findById(complaint.farmerId)
      .select('wardId wardName talukName')
      .lean();

    const resolvedWard = await resolveWardForComplaint({
      farmerWardId: clean((farmer as { wardId?: string } | null)?.wardId),
      farmerWardName: clean((farmer as { wardName?: string } | null)?.wardName),
      complaintWardId: clean((complaint as { wardId?: string }).wardId),
      complaintWardName: clean((complaint as { wardName?: string; ward?: string }).wardName || (complaint as { ward?: string }).ward),
      complaintLocation: clean((complaint as { farmerLocation?: string }).farmerLocation),
    });
    if (!resolvedWard) {
      continue;
    }

    const assignedAdmin = await UserModel.findOne({
      role: 'taluk_admin',
      assignedWardId: resolvedWard.wardId,
    })
      .select('_id')
      .lean();

    const setUpdate: Record<string, unknown> = {
      wardId: resolvedWard.wardId,
      wardName: resolvedWard.wardName,
      talukName: resolvedWard.talukName,
    };
    if (assignedAdmin?._id) {
      setUpdate.talukAdminId = new mongoose.Types.ObjectId(String(assignedAdmin._id));
    }

    const write = await ComplaintModel.updateOne({ _id: complaint._id }, { $set: setUpdate });
    if (write.modifiedCount > 0) {
      updated += 1;
    }
  }

  console.log('[ward-mapping] complaint backfill completed', {
    scanned: complaints.length,
    updated,
  });
}

async function run(): Promise<void> {
  await connectDB();
  await upsertWardMappings();
  await assignTalukAdminsToWards();
  await backfillComplaintWardData();
}

void run()
  .then(async () => {
    await disconnectDB();
    console.log('[ward-mapping] completed successfully');
  })
  .catch(async (error) => {
    console.error('[ward-mapping] failed', error);
    await disconnectDB();
    process.exit(1);
  });
