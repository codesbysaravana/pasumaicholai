import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import {
  getAdminCrops,
  getRecommendedCropPrices,
  recalculateCropPrices,
  updateSingleCropPrice,
  uploadCropPrices,
} from './crop-pricing.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

const cropPricingRouter = Router();

cropPricingRouter.get('/admin/crops', requireAuth, requireRole('admin'), getAdminCrops);
cropPricingRouter.post(
  '/admin/upload-crop-prices',
  requireAuth,
  requireRole('admin'),
  upload.single('file'),
  uploadCropPrices,
);
cropPricingRouter.post(
  '/admin/update-crop-price',
  requireAuth,
  requireRole('admin'),
  updateSingleCropPrice,
);
cropPricingRouter.post(
  '/system/recalculate-crop-prices',
  requireAuth,
  requireRole('admin'),
  recalculateCropPrices,
);
cropPricingRouter.get(
  '/farmer/recommended-crop-prices',
  requireAuth,
  requireRole('farmer'),
  getRecommendedCropPrices,
);

export { cropPricingRouter };
