import { Router } from 'express';
import { upsertCart } from '../controllers/consumer-marketplace.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const cartRouter = Router();

cartRouter.post('/', requireAuth, requireRole('consumer'), upsertCart);

export { cartRouter };
