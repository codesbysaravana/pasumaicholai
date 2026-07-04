import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),

  // Database (MongoDB)
  MONGODB_URI: z.string().url(),
  MONGODB_DB_NAME: z.string().min(1).default('pasumai_cholai'),

  // AWS
  AWS_REGION: z.string().default(process.env.AWS_DEFAULT_REGION ?? 'us-east-1'),
  AWS_DEFAULT_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_SESSION_TOKEN: z.string().optional(),
  AWS_TRANSCRIBE_BUCKET: z.string().optional(),
  S3_BUCKET_NAME: z.string().optional(),
  SNS_SMS_ENABLED: z.string().optional(),
  SNS_SMS_SENDER_ID: z.string().optional(),
  SMS_DEFAULT_COUNTRY_CODE: z.string().optional(),

  // JWT / Auth
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECRET: z.string().min(16),
  CLIENT_ORIGIN: z.string().default('*'),
  AI_SERVICE_URL: z.string().url().default('https://uaq6afesa3.execute-api.us-east-1.amazonaws.com'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_SUCCESS_URL: z
    .string()
    .url()
    .default('http://localhost:5173/dashboard/consumer/marketplace/success'),
  STRIPE_CANCEL_URL: z
    .string()
    .url()
    .default('http://localhost:5173/dashboard/consumer/marketplace/checkout'),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
});

const _parsed = envSchema.safeParse(process.env);

if (!_parsed.success) {
  console.error('❌  Invalid environment variables:\n', _parsed.error.format());
  process.exit(1);
}

export const env = _parsed.data;
export type Env = typeof env;
