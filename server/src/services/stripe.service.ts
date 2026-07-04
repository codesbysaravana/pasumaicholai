import Stripe from 'stripe';
import { env } from '../config/env.config.js';
import { ApiError } from '../utils/api-error.js';

interface CheckoutLineItemInput {
  name: string;
  description: string;
  unitAmountInPaise: number;
  quantity: number;
  imageUrl?: string;
}

interface CreateCheckoutSessionInput {
  customerEmail?: string;
  lineItems: CheckoutLineItemInput[];
  metadata: Record<string, string>;
}

class StripeService {
  private readonly secretKey = env.STRIPE_SECRET_KEY;
  private readonly webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  private client: Stripe | null = null;

  public isConfigured(): boolean {
    return Boolean(this.secretKey);
  }

  public hasWebhookSecret(): boolean {
    return Boolean(this.webhookSecret);
  }

  private getClient(): Stripe {
    if (!this.secretKey) {
      throw new ApiError(400, 'Stripe is not configured');
    }
    if (!this.client) {
      this.client = new Stripe(this.secretKey);
    }
    return this.client;
  }

  public async createCheckoutSession(payload: CreateCheckoutSessionInput): Promise<Stripe.Checkout.Session> {
    const client = this.getClient();
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = payload.lineItems.map((item) => ({
      price_data: {
        currency: 'inr',
        product_data: {
          name: item.name,
          description: item.description,
          ...(item.imageUrl ? { images: [item.imageUrl] } : {}),
        },
        unit_amount: item.unitAmountInPaise,
      },
      quantity: item.quantity,
    }));

    return client.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: `${env.STRIPE_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: env.STRIPE_CANCEL_URL,
      ...(payload.customerEmail ? { customer_email: payload.customerEmail } : {}),
      metadata: payload.metadata,
    });
  }

  public constructEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const client = this.getClient();
    if (!this.webhookSecret) {
      throw new ApiError(400, 'Stripe webhook secret is not configured');
    }
    return client.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
  }

  public async retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    const client = this.getClient();
    return client.checkout.sessions.retrieve(sessionId);
  }
}

export const stripeService = new StripeService();
