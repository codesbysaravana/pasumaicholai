import crypto from 'crypto';
import Razorpay from 'razorpay';
import { env } from '../config/env.config.js';
import { ApiError } from '../utils/api-error.js';

interface CreateRazorpayOrderInput {
  amountInPaise: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderDetails {
  id: string;
  amount: number;
  currency: string;
}

export interface RazorpayPaymentDetails {
  id: string;
  order_id: string;
  status: string;
}

class RazorpayService {
  private readonly keyId = env.RAZORPAY_KEY_ID;
  private readonly keySecret = env.RAZORPAY_KEY_SECRET;
  private readonly webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;
  private client: Razorpay | null = null;

  public isConfigured(): boolean {
    return Boolean(this.keyId && this.keySecret);
  }

  public getPublicKeyId(): string {
    if (!this.keyId) {
      throw new ApiError(400, 'Razorpay is not configured');
    }
    return this.keyId;
  }

  public hasWebhookSecret(): boolean {
    return Boolean(this.webhookSecret);
  }

  private getClient(): Razorpay {
    if (!this.keyId || !this.keySecret) {
      throw new ApiError(400, 'Razorpay is not configured');
    }
    if (!this.client) {
      this.client = new Razorpay({
        key_id: this.keyId,
        key_secret: this.keySecret,
      });
    }
    return this.client;
  }

  public async createOrder(payload: CreateRazorpayOrderInput): Promise<RazorpayOrderDetails> {
    const client = this.getClient();
    const order = await client.orders.create({
      amount: payload.amountInPaise,
      currency: payload.currency ?? 'INR',
      receipt: payload.receipt,
      notes: payload.notes,
    } as never);
    return order as unknown as RazorpayOrderDetails;
  }

  public async fetchOrder(orderId: string): Promise<RazorpayOrderDetails> {
    const client = this.getClient();
    const order = await client.orders.fetch(orderId);
    return order as unknown as RazorpayOrderDetails;
  }

  public async fetchPayment(paymentId: string): Promise<RazorpayPaymentDetails> {
    const client = this.getClient();
    const payment = await client.payments.fetch(paymentId);
    return payment as unknown as RazorpayPaymentDetails;
  }

  public verifyPaymentSignature(input: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }): boolean {
    if (!this.keySecret) {
      throw new ApiError(400, 'Razorpay is not configured');
    }
    const body = `${input.razorpayOrderId}|${input.razorpayPaymentId}`;
    const expectedSignature = crypto.createHmac('sha256', this.keySecret).update(body).digest('hex');
    return expectedSignature === input.razorpaySignature;
  }

  public verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    if (!this.webhookSecret) {
      throw new ApiError(400, 'Razorpay webhook secret is not configured');
    }
    const expectedSignature = crypto.createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    return expectedSignature === signature;
  }
}

export const razorpayService = new RazorpayService();
