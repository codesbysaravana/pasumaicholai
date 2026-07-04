import type { Request, Response } from 'express';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { z } from 'zod';
import { ApiError } from '../../utils/api-error.js';
import { asyncHandler } from '../../utils/async-handler.js';
import {
  getAllCrops,
  getFarmerRecommendedCropPrices,
  recalculateAllCropPrices,
  updateCropBasePrice,
  updateCropPricesFromCsvRows,
} from './crop-pricing.service.js';

const updateCropPriceSchema = z.object({
  crop_name: z.string().min(2, 'Crop name is required'),
  base_price: z.coerce.number().positive('Base price should be greater than 0'),
});

type CsvRow = {
  crop_name: string;
  base_price: number;
};

async function parseCropPriceCsv(buffer: Buffer): Promise<CsvRow[]> {
  return new Promise((resolve, reject) => {
    const rawRows: Array<{ crop_name: string; base_price_raw: string }> = [];
    const stream = Readable.from(buffer);
    stream
      .pipe(
        csv({
          mapHeaders: ({ header }) => header.trim().toLowerCase(),
        }),
      )
      .on('data', (raw: Record<string, string>) => {
        const nameCell = (raw.crop_name ?? raw.crop ?? raw.name ?? '').trim();
        const priceRaw = (raw.base_price ?? raw.price ?? '').trim();
        if (!nameCell && !priceRaw) {
          return;
        }
        rawRows.push({
          crop_name: nameCell,
          base_price_raw: priceRaw,
        });
      })
      .on('error', (error: Error) => {
        reject(new ApiError(400, `Unable to parse CSV file: ${error.message}`));
      })
      .on('end', () => {
        const rows: CsvRow[] = [];
        for (const row of rawRows) {
          if (!row.crop_name) {
            reject(new ApiError(400, 'CSV validation failed: crop_name is required for all rows'));
            return;
          }
          const price = Number(row.base_price_raw);
          if (!Number.isFinite(price) || price <= 0) {
            reject(
              new ApiError(400, `CSV validation failed: invalid base_price for "${row.crop_name}"`),
            );
            return;
          }
          rows.push({
            crop_name: row.crop_name,
            base_price: price,
          });
        }

        resolve(rows);
      });
  });
}

export const getAdminCrops = asyncHandler(async (_req: Request, res: Response) => {
  const crops = await getAllCrops();
  res.status(200).json({
    success: true,
    data: crops,
  });
});

export const getRecommendedCropPrices = asyncHandler(async (_req: Request, res: Response) => {
  const crops = await getFarmerRecommendedCropPrices();
  res.status(200).json({
    success: true,
    data: crops,
  });
});

export const updateSingleCropPrice = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateCropPriceSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? 'Invalid payload');
  }

  const updated = await updateCropBasePrice(parsed.data);
  res.status(200).json({
    success: true,
    message: 'Crop base price updated successfully',
    data: updated,
  });
});

export const uploadCropPrices = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ApiError(400, 'CSV file is required');
  }
  if (req.file.size === 0) {
    throw new ApiError(400, 'Uploaded CSV file is empty');
  }

  const rows = await parseCropPriceCsv(req.file.buffer);
  if (rows.length === 0) {
    throw new ApiError(400, 'CSV file has no valid data rows');
  }

  const result = await updateCropPricesFromCsvRows(rows);
  res.status(200).json({
    success: true,
    message: 'Crop prices uploaded successfully',
    data: result,
  });
});

export const recalculateCropPrices = asyncHandler(async (_req: Request, res: Response) => {
  const result = await recalculateAllCropPrices();
  res.status(200).json({
    success: true,
    message: 'Crop prices recalculated successfully',
    data: result,
  });
});
