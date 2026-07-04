import { Router } from 'express';
import {
  createCheckoutSession,
  createRazorpayOrder,
  getCheckoutSessionStatus,
  handleRazorpayWebhook,
  handleStripeWebhook,
  verifyRazorpayPayment,
} from '../controllers/payment.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const paymentRouter = Router();

paymentRouter.post('/checkout-session', requireAuth, requireRole('consumer'), createCheckoutSession);
paymentRouter.get('/session/:sessionId', requireAuth, requireRole('consumer'), getCheckoutSessionStatus);
paymentRouter.post('/webhook', handleStripeWebhook);
paymentRouter.post('/razorpay/create-order', requireAuth, requireRole('consumer'), createRazorpayOrder);
paymentRouter.post('/razorpay/verify', requireAuth, requireRole('consumer'), verifyRazorpayPayment);
paymentRouter.post('/razorpay/webhook', handleRazorpayWebhook);

export { paymentRouter };
