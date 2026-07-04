import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.config.js';
import { ApiError } from './api-error.js';

const checkoutPayloadSchema = z.object({
  consumerId: z.string().min(1),
  farmerId: z.string().min(1),
  amountInPaise: z.number().int().positive(),
  currency: z.string().min(3).default('INR'),
  deliveryAddress: z.object({
    name: z.string().min(2),
    phone: z.string().min(6),
    location: z.string().min(2),
    notes: z.string().optional(),
  }),
  items: z
    .array(
      z.object({
        listingId: z.string().min(1),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});

export type CheckoutVerificationPayload = z.infer<typeof checkoutPayloadSchema>;

export function createCheckoutVerificationToken(payload: CheckoutVerificationPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '30m',
    issuer: 'pasumai-cholai',
    audience: 'checkout-verification',
  });
}

export function verifyCheckoutVerificationToken(token: string): CheckoutVerificationPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      issuer: 'pasumai-cholai',
      audience: 'checkout-verification',
    });
    return checkoutPayloadSchema.parse(decoded);
  } catch {
    throw new ApiError(400, 'Invalid or expired checkout verification token');
  }
}
