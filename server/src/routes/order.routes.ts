import { Router } from 'express';
import { createOrder, createOrderFromListing, getFarmerOrders } from '../controllers/consumer-marketplace.controller.js';
import {
  acceptDeliveryJob,
  getAssignedDeliveries,
  getAvailableDeliveries,
  getConsumerOrderTracking,
  updateAssignedDeliveryStatus,
} from '../controllers/delivery.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const orderRouter = Router();

orderRouter.post('/', requireAuth, requireRole('consumer'), createOrder);
orderRouter.post('/create', requireAuth, requireRole('consumer'), createOrderFromListing);
orderRouter.get('/farmer', requireAuth, requireRole('farmer'), getFarmerOrders);
orderRouter.get('/consumer/:id/tracking', requireAuth, requireRole('consumer'), getConsumerOrderTracking);
orderRouter.get('/delivery/available', requireAuth, requireRole('delivery'), getAvailableDeliveries);
orderRouter.get('/delivery/assigned', requireAuth, requireRole('delivery'), getAssignedDeliveries);
orderRouter.put('/delivery/:id/accept', requireAuth, requireRole('delivery'), acceptDeliveryJob);
orderRouter.put('/delivery/:id/status', requireAuth, requireRole('delivery'), updateAssignedDeliveryStatus);

export { orderRouter };
