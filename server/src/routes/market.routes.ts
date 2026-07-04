import { Router } from 'express';
import {
  createProduct,
  getMyProducts,
  getProductById,
  getProducts,
} from '../controllers/market.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate-request.middleware.js';
import { createProductBodySchema, productIdParamsSchema } from '../validations/request.schemas.js';

const marketRouter = Router();

marketRouter.get('/', getProducts);
marketRouter.get('/my-listings', requireAuth, requireRole('farmer'), getMyProducts);
marketRouter.get('/:productId', validateRequest({ params: productIdParamsSchema }), getProductById);
marketRouter.post('/', requireAuth, requireRole('farmer'), validateRequest({ body: createProductBodySchema }), createProduct);

export { marketRouter };
