import crypto from 'crypto';
import app from '../src/app.js';
import { NotificationModel } from '../src/models/notification.model.js';
import { OrderModel } from '../src/models/order.model.js';
import { UserModel } from '../src/models/user.model.js';
import { MarketplaceListingModel } from '../src/modules/marketplace/marketplace.model.js';
import { razorpayService } from '../src/services/razorpay.service.js';
import { getAuthCookieName, signAccessToken } from '../src/utils/auth-token.js';

type TestResult = {
  name: string;
  status: number;
  ok: boolean;
};

async function run(): Promise<void> {
  const server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Unable to get test server address');
  }

  const base = `http://127.0.0.1:${address.port}/api/v1`;
  const results: TestResult[] = [];
  const consumerId = '507f1f77bcf86cd799439011';
  const farmerId = '507f1f77bcf86cd799439012';
  const listingId = '507f1f77bcf86cd799439013';
  const authToken = signAccessToken(consumerId, 'consumer');
  const authCookie = `${getAuthCookieName()}=${authToken}`;

  async function post(path: string, body: unknown, headers?: Record<string, string>): Promise<{ status: number; body: unknown }> {
    const response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(headers ?? {}),
      },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as unknown;
    return { status: response.status, body: payload };
  }

  const originalFind = MarketplaceListingModel.find.bind(MarketplaceListingModel);
  const originalFindById = MarketplaceListingModel.findById.bind(MarketplaceListingModel);
  const originalOrderFindOne = OrderModel.findOne.bind(OrderModel);
  const originalOrderCreate = OrderModel.create.bind(OrderModel);
  const originalNotificationCreate = NotificationModel.create.bind(NotificationModel);
  const originalUserFindById = UserModel.findById.bind(UserModel);
  const originalCreateOrder = razorpayService.createOrder.bind(razorpayService);
  const originalFetchOrder = razorpayService.fetchOrder.bind(razorpayService);
  const originalFetchPayment = razorpayService.fetchPayment.bind(razorpayService);

  let createdOrdersCount = 0;
  let capturedCheckoutToken = '';

  const listingDoc = {
    _id: listingId,
    farmerId,
    productName: 'Tomato',
    cropName: 'Tomato',
    description: 'Fresh',
    pricePerKg: 100,
    quantityAvailable: 10,
    quantity: 10,
    images: [],
    isActive: true,
    status: 'active',
    save: async () => undefined,
  };

  (MarketplaceListingModel.find as unknown as (...args: unknown[]) => unknown) = () =>
    ({
      lean: async () => [listingDoc],
    }) as unknown;
  (MarketplaceListingModel.findById as unknown as (...args: unknown[]) => unknown) = async () => listingDoc as unknown;
  (OrderModel.findOne as unknown as (...args: unknown[]) => unknown) = () =>
    ({
      lean: async () => null,
      select: () => ({
        lean: async () => null,
      }),
    }) as unknown;
  (OrderModel.create as unknown as (...args: unknown[]) => unknown) = async () => {
    createdOrdersCount += 1;
    return { _id: `mock-order-${createdOrdersCount}`, productName: 'Tomato' };
  };
  (NotificationModel.create as unknown as (...args: unknown[]) => unknown) = async () => ({});
  (UserModel.findById as unknown as (...args: unknown[]) => unknown) = () =>
    ({
      select: () => ({
        lean: async () => ({ email: 'consumer@example.com' }),
      }),
    }) as unknown;
  razorpayService.createOrder = (async () =>
    ({
      id: 'order_test_123',
      amount: 20000,
      currency: 'INR',
    }) as unknown) as typeof razorpayService.createOrder;
  razorpayService.fetchOrder = (async () =>
    ({
      id: 'order_test_123',
      amount: 20000,
      currency: 'INR',
    }) as unknown) as typeof razorpayService.fetchOrder;
  razorpayService.fetchPayment = (async () =>
    ({
      id: 'pay_test_123',
      order_id: 'order_test_123',
      status: 'captured',
    }) as unknown) as typeof razorpayService.fetchPayment;

  try {
    const t1 = await post('/payments/razorpay/create-order', {
      items: [{ listingId: 'listing', quantity: 1 }],
      delivery_address: { name: 'Tester', phone: '111111', location: 'Chennai' },
    });
    results.push({
      name: 'POST /payments/razorpay/create-order requires auth',
      status: t1.status,
      ok: t1.status === 401,
    });

    const t2 = await post('/payments/razorpay/verify', {
      razorpay_order_id: 'order',
      razorpay_payment_id: 'payment',
      razorpay_signature: 'signature',
      checkout_token: 'token',
    });
    results.push({
      name: 'POST /payments/razorpay/verify requires auth',
      status: t2.status,
      ok: t2.status === 401,
    });

    const webhookPayload = {
      event: 'payment.authorized',
      payload: {
        payment: {
          entity: {
            id: 'pay_test',
            order_id: 'order_test',
            status: 'authorized',
          },
        },
      },
    };

    const t3 = await post('/payments/razorpay/webhook', webhookPayload);
    results.push({
      name: 'POST /payments/razorpay/webhook rejects missing signature',
      status: t3.status,
      ok: t3.status === 400,
    });

    const t4 = await post('/payments/razorpay/webhook', webhookPayload, {
      'x-razorpay-signature': 'invalid',
    });
    results.push({
      name: 'POST /payments/razorpay/webhook rejects invalid signature',
      status: t4.status,
      ok: t4.status === 400,
    });

    const raw = JSON.stringify(webhookPayload);
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? '';
    const signature = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    const t5 = await fetch(`${base}/payments/razorpay/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': signature,
      },
      body: raw,
    });
    results.push({
      name: 'POST /payments/razorpay/webhook accepts valid signature',
      status: t5.status,
      ok: t5.status === 200,
    });

    const t6 = await post('/payments/checkout-session', {
      items: [{ listingId: 'listing', quantity: 1 }],
      delivery_address: { name: 'Tester', phone: '111111', location: 'Chennai' },
    });
    results.push({
      name: 'POST /payments/checkout-session still requires auth (Stripe unchanged)',
      status: t6.status,
      ok: t6.status === 401,
    });

    const t7 = await post('/payments/webhook', { id: 'evt', type: 'checkout.session.completed' });
    results.push({
      name: 'POST /payments/webhook enforces Stripe signature (Stripe unchanged)',
      status: t7.status,
      ok: t7.status === 400,
    });

    const t8 = await post(
      '/payments/razorpay/create-order',
      {
        items: [{ listingId, quantity: 2 }],
        delivery_address: { name: 'Tester', phone: '111111', location: 'Chennai' },
      },
      { Cookie: authCookie },
    );
    const t8Body = t8.body as { data?: { checkout_token?: string } };
    capturedCheckoutToken = t8Body.data?.checkout_token ?? '';
    results.push({
      name: 'POST /payments/razorpay/create-order success path',
      status: t8.status,
      ok: t8.status === 200 && Boolean(capturedCheckoutToken),
    });

    const paymentId = 'pay_test_123';
    const orderId = 'order_test_123';
    const verifySignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET ?? '').update(`${orderId}|${paymentId}`).digest('hex');
    const t9 = await post(
      '/payments/razorpay/verify',
      {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: verifySignature,
        checkout_token: capturedCheckoutToken,
      },
      { Cookie: authCookie },
    );
    results.push({
      name: 'POST /payments/razorpay/verify success path',
      status: t9.status,
      ok: t9.status === 200,
    });

    const allPassed = results.every((result) => result.ok);
    console.log(JSON.stringify({ allPassed, results }, null, 2));
    process.exitCode = allPassed ? 0 : 1;
  } finally {
    MarketplaceListingModel.find = originalFind;
    MarketplaceListingModel.findById = originalFindById;
    OrderModel.findOne = originalOrderFindOne;
    OrderModel.create = originalOrderCreate;
    NotificationModel.create = originalNotificationCreate;
    UserModel.findById = originalUserFindById;
    razorpayService.createOrder = originalCreateOrder;
    razorpayService.fetchOrder = originalFetchOrder;
    razorpayService.fetchPayment = originalFetchPayment;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

void run();
