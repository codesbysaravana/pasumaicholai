import { ApiError } from '../../utils/api-error.js';
import { logger } from '../../utils/logger.js';
import { MarketplaceListingModel } from '../marketplace/marketplace.model.js';
import { OrderModel } from '../../models/order.model.js';
import { CropProductModel } from './crop-pricing.model.js';
import { defaultCropSeedData } from './crop-pricing.seed.js';

type ParsedCsvRow = {
  crop_name: string;
  base_price: number;
};

type CropPriceView = {
  crop: string;
  category: 'vegetable' | 'fruit';
  base_price: number;
  recommended_price: number;
  demand_score: number;
  last_updated: string;
};

function normalizeCropName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

function roundPrice(price: number): number {
  return Number(price.toFixed(2));
}

function getDemandMultiplier(demandScore: number): number {
  if (demandScore < 0.3) {
    return 0.9;
  }
  if (demandScore < 0.6) {
    return 1.0;
  }
  if (demandScore < 0.8) {
    return 1.1;
  }
  return 1.2;
}

async function computeDemandScoreForCrop(cropName: string): Promise<number> {
  const now = Date.now();
  const last24Hours = new Date(now - 24 * 60 * 60 * 1000);
  const last7Days = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const escaped = cropName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const cropRegex = new RegExp(`^${escaped}$`, 'i');

  const [ordersLast24h, ordersLastWeek, farmerListings] = await Promise.all([
    OrderModel.countDocuments({
      productName: cropRegex,
      createdAt: { $gte: last24Hours },
      status: { $ne: 'cancelled' },
    }),
    OrderModel.countDocuments({
      productName: cropRegex,
      createdAt: { $gte: last7Days },
      status: { $ne: 'cancelled' },
    }),
    MarketplaceListingModel.countDocuments({
      $or: [{ cropName: cropRegex }, { productName: cropRegex }],
      isActive: true,
    }),
  ]);

  // Light normalization keeps weighted demand between 0 and 1.
  const normalized24h = Math.min(ordersLast24h / 25, 1);
  const normalizedWeek = Math.min(ordersLastWeek / 120, 1);
  const normalizedListings = Math.min(farmerListings / 40, 1);
  const score = normalized24h * 0.5 + normalizedWeek * 0.3 + normalizedListings * 0.2;

  return Number(Math.max(0, Math.min(1, score)).toFixed(4));
}

function serializeCrop(doc: {
  name: string;
  category: 'vegetable' | 'fruit';
  base_price: number;
  recommended_price: number;
  demand_score: number;
  last_updated: Date;
}): CropPriceView {
  return {
    crop: doc.name,
    category: doc.category,
    base_price: doc.base_price,
    recommended_price: doc.recommended_price,
    demand_score: Number(doc.demand_score.toFixed(4)),
    last_updated: doc.last_updated.toISOString(),
  };
}

export async function ensureCropCatalog(): Promise<void> {
  const total = await CropProductModel.countDocuments();
  if (total > 0) {
    return;
  }

  const seedOps = defaultCropSeedData.map((seed) => ({
    updateOne: {
      filter: { name: seed.name },
      update: {
        $setOnInsert: {
          name: seed.name,
          category: seed.category,
          base_price: seed.base_price,
          demand_score: 0.5,
          recommended_price: seed.base_price,
          last_updated: new Date(),
        },
      },
      upsert: true,
    },
  }));

  if (seedOps.length > 0) {
    await CropProductModel.bulkWrite(seedOps, { ordered: false });
  }
}

export async function seedCropCatalog(force = false): Promise<{ seeded: number }> {
  if (force) {
    await CropProductModel.deleteMany({});
  }
  await ensureCropCatalog();
  const count = await CropProductModel.countDocuments();
  return { seeded: count };
}

export async function getAllCrops(): Promise<CropPriceView[]> {
  await ensureCropCatalog();
  const crops = await CropProductModel.find().sort({ category: 1, name: 1 }).lean();
  return crops.map((crop) => serializeCrop(crop));
}

export async function updateCropBasePrice(input: {
  crop_name: string;
  base_price: number;
}): Promise<CropPriceView> {
  await ensureCropCatalog();
  const normalizedTarget = normalizeCropName(input.crop_name);
  const escapedTarget = normalizedTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const crop = await CropProductModel.findOne({
    $or: [{ name: input.crop_name }, { name: new RegExp(`^${escapedTarget}$`, 'i') }],
  });
  if (!crop) {
    throw new ApiError(404, `Unknown crop name: ${input.crop_name}`);
  }

  crop.base_price = roundPrice(input.base_price);
  const demandScore = await computeDemandScoreForCrop(crop.name);
  crop.demand_score = demandScore;
  crop.recommended_price = roundPrice(crop.base_price * getDemandMultiplier(demandScore));
  crop.last_updated = new Date();
  await crop.save();

  return serializeCrop({
    name: crop.name,
    category: crop.category,
    base_price: crop.base_price,
    recommended_price: crop.recommended_price,
    demand_score: crop.demand_score,
    last_updated: crop.last_updated,
  });
}

export async function updateCropPricesFromCsvRows(rows: ParsedCsvRow[]): Promise<{
  updated: number;
  invalid_crops: string[];
}> {
  await ensureCropCatalog();
  if (rows.length === 0) {
    throw new ApiError(400, 'CSV file has no valid rows');
  }

  const crops = await CropProductModel.find().select('_id name').lean();
  const byName = new Map(crops.map((crop) => [normalizeCropName(crop.name), crop]));

  const invalidCrops: string[] = [];
  const now = new Date();
  const bulkOps = rows.flatMap((row) => {
    const match = byName.get(normalizeCropName(row.crop_name));
    if (!match) {
      invalidCrops.push(row.crop_name);
      return [];
    }
    return [
      {
        updateOne: {
          filter: { _id: match._id },
          update: {
            $set: {
              base_price: roundPrice(row.base_price),
              last_updated: now,
            },
          },
        },
      },
    ];
  });

  if (bulkOps.length === 0) {
    throw new ApiError(400, 'No matching crop names found in CSV');
  }

  await CropProductModel.bulkWrite(bulkOps, { ordered: false });
  await recalculateAllCropPrices();

  return {
    updated: bulkOps.length,
    invalid_crops: Array.from(new Set(invalidCrops)),
  };
}

export async function recalculateAllCropPrices(): Promise<{
  recalculated: number;
  updatedAt: string;
}> {
  await ensureCropCatalog();
  const crops = await CropProductModel.find().select('_id name base_price').lean();
  if (crops.length === 0) {
    return { recalculated: 0, updatedAt: new Date().toISOString() };
  }

  const recalculated = await Promise.all(
    crops.map(async (crop) => {
      const demandScore = await computeDemandScoreForCrop(crop.name);
      const recommended = roundPrice(crop.base_price * getDemandMultiplier(demandScore));
      return {
        id: crop._id,
        demandScore,
        recommended,
      };
    }),
  );

  const now = new Date();
  await CropProductModel.bulkWrite(
    recalculated.map((entry) => ({
      updateOne: {
        filter: { _id: entry.id },
        update: {
          $set: {
            demand_score: entry.demandScore,
            recommended_price: entry.recommended,
            last_updated: now,
          },
        },
      },
    })),
    { ordered: false },
  );

  logger.info('Crop prices recalculated', { count: recalculated.length });
  return {
    recalculated: recalculated.length,
    updatedAt: now.toISOString(),
  };
}

export async function getFarmerRecommendedCropPrices(): Promise<CropPriceView[]> {
  await ensureCropCatalog();
  const crops = await CropProductModel.find().sort({ demand_score: -1, name: 1 }).lean();
  return crops.map((crop) => serializeCrop(crop));
}
