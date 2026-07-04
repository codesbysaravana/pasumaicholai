import { Router } from 'express';
import {
  getFarmerPaymentNotifications,
  getFarmerPayments,
  markFarmerPaymentNotificationsSeen,
} from '../controllers/farmer-payments.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const farmerPaymentsRouter = Router();

farmerPaymentsRouter.get('/', requireAuth, requireRole('farmer'), getFarmerPayments);
farmerPaymentsRouter.get('/notifications', requireAuth, requireRole('farmer'), getFarmerPaymentNotifications);
farmerPaymentsRouter.post('/notifications/mark-seen', requireAuth, requireRole('farmer'), markFarmerPaymentNotificationsSeen);

export { farmerPaymentsRouter };
