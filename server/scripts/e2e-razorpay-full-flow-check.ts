import 'dotenv/config';
import crypto from 'crypto';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { MarketplaceListingModel } from '../src/modules/marketplace/marketplace.model.js';
import { OrderModel } from '../src/models/order.model.js';
import { UserModel } from '../src/models/user.model.js';
import { razorpayService } from '../src/services/razorpay.service.js';
import { getAuthCookieName, signAccessToken } from '../src/utils/auth-token.js';

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
};

type CheckResult = {
  name: string;
  ok: boolean;
  detail: string;
};

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function run(): Promise<void> {
  await connectDB();

  const server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to open local test server');
  }
  const base = `http://127.0.0.1:${address.port}/api/v1`;
  const checks: CheckResult[] = [];

  const runId = Date.now();
  const farmer = await UserModel.create({
    fullName: `E2E Farmer ${runId}`,
    email: `e2e-farmer-${runId}@example.com`,
    passwordHash: 'e2e-password-hash',
    role: 'farmer',
    phone: '9999999991',
  });
  const consumer = await UserModel.create({
    fullName: `E2E Consumer ${runId}`,
    email: `e2e-consumer-${runId}@example.com`,
    passwordHash: 'e2e-password-hash',
    role: 'consumer',
    phone: '9999999992',
  });

  const listing = await MarketplaceListingModel.create({
    farmerId: String(farmer._id),
    farmer: {
      name: farmer.fullName,
      phone: farmer.phone,
      location: 'Chennai',
    },
    cropName: 'Tomato',
    productName: 'Tomato',
    category: 'vegetable',
    quantity: 20,
    quantityAvailable: 20,
    pricePerKg: 120,
    harvestDate: new Date(),
    description: 'Fresh e2e test tomatoes',
    location: 'Chennai',
    images: [],
    unit: 'kg',
    isActive: true,
    status: 'active',
  });

  const consumerCookie = `${getAuthCookieName()}=${signAccessToken(String(consumer._id), 'consumer')}`;
  const farmerCookie = `${getAuthCookieName()}=${signAccessToken(String(farmer._id), 'farmer')}`;

  const originalCreateOrder = razorpayService.createOrder.bind(razorpayService);
  const originalFetchOrder = razorpayService.fetchOrder.bind(razorpayService);
  const originalFetchPayment = razorpayService.fetchPayment.bind(razorpayService);

  const mockedOrderId = `order_e2e_${runId}`;
  const mockedPaymentId = `pay_e2e_${runId}`;
  const expectedAmount = 2 * 120 * 100;

  razorpayService.createOrder = (async () =>
    ({
      id: mockedOrderId,
      amount: expectedAmount,
      currency: 'INR',
    }) as unknown) as typeof razorpayService.createOrder;
  razorpayService.fetchOrder = (async () =>
    ({
      id: mockedOrderId,
      amount: expectedAmount,
      currency: 'INR',
    }) as unknown) as typeof razorpayService.fetchOrder;
  razorpayService.fetchPayment = (async () =>
    ({
      id: mockedPaymentId,
      order_id: mockedOrderId,
      status: 'captured',
    }) as unknown) as typeof razorpayService.fetchPayment;

  let createdOrderId = '';

  try {
    const createOrderResponse = await fetch(`${base}/payments/razorpay/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: consumerCookie,
      },
      body: JSON.stringify({
        items: [{ listingId: String(listing._id), quantity: 2 }],
        delivery_address: {
          name: consumer.fullName,
          phone: consumer.phone,
          location: 'Chennai',
        },
      }),
    });
    const createOrderPayload = (await createOrderResponse.json()) as ApiEnvelope<{
      id: string;
      amount: number;
      currency: string;
      checkout_token: string;
    }>;
    assert(createOrderResponse.status === 200, `create-order failed: ${createOrderPayload.message ?? createOrderResponse.status}`);
    assert(Boolean(createOrderPayload.data?.checkout_token), 'Missing checkout token');
    checks.push({ name: 'Razorpay create-order', ok: true, detail: `HTTP ${createOrderResponse.status}` });

    const checkoutToken = createOrderPayload.data?.checkout_token ?? '';
    const signatureSecret = process.env.RAZORPAY_KEY_SECRET ?? '';
    assert(Boolean(signatureSecret), 'RAZORPAY_KEY_SECRET missing in environment');
    const signature = crypto.createHmac('sha256', signatureSecret).update(`${mockedOrderId}|${mockedPaymentId}`).digest('hex');

    const verifyResponse = await fetch(`${base}/payments/razorpay/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: consumerCookie,
      },
      body: JSON.stringify({
        razorpay_order_id: mockedOrderId,
        razorpay_payment_id: mockedPaymentId,
        razorpay_signature: signature,
        checkout_token: checkoutToken,
      }),
    });
    const verifyPayload = (await verifyResponse.json()) as ApiEnvelope<{
      status: string;
      orderId: string;
      paymentStatus: string;
    }>;
    assert(verifyResponse.status === 200, `verify failed: ${verifyPayload.message ?? verifyResponse.status}`);
    createdOrderId = verifyPayload.data?.orderId ?? '';
    assert(Boolean(createdOrderId), 'verify did not return order id');
    checks.push({ name: 'Razorpay verify', ok: true, detail: `HTTP ${verifyResponse.status}` });

    const savedOrder = await OrderModel.findById(createdOrderId).lean();
    assert(Boolean(savedOrder), 'Order not persisted');
    assert(savedOrder?.paymentStatus === 'paid', 'Order paymentStatus is not paid');
    assert(savedOrder?.paymentProvider === 'razorpay', 'Order paymentProvider is not razorpay');
    assert(savedOrder?.paymentId === mockedPaymentId, 'Order paymentId mismatch');
    assert(Boolean(savedOrder?.paidAt), 'Order paidAt missing');
    assert(savedOrder?.farmerNotified === false, 'Order farmerNotified should be false initially');
    checks.push({ name: 'Order paid fields persisted', ok: true, detail: String(savedOrder?._id) });

    const notificationsResponse = await fetch(`${base}/farmer/payments/notifications`, {
      method: 'GET',
      headers: {
        Cookie: farmerCookie,
      },
    });
    const notificationsPayload = (await notificationsResponse.json()) as ApiEnvelope<
      Array<{ id: string; productName: string; paymentStatus: string }>
    >;
    assert(notificationsResponse.status === 200, 'Failed to fetch farmer payment notifications');
    const notifications = notificationsPayload.data ?? [];
    const targetNotification = notifications.find((entry) => entry.id === createdOrderId);
    assert(Boolean(targetNotification), 'Paid order missing from farmer notifications');
    checks.push({ name: 'Farmer sees payment notification', ok: true, detail: `count=${notifications.length}` });

    const markSeenResponse = await fetch(`${base}/farmer/payments/notifications/mark-seen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: farmerCookie,
      },
      body: JSON.stringify({
        notificationIds: [createdOrderId],
      }),
    });
    const markSeenPayload = (await markSeenResponse.json()) as ApiEnvelope<{ markedCount: number }>;
    assert(markSeenResponse.status === 200, 'Failed to mark payment notification seen');
    assert((markSeenPayload.data?.markedCount ?? 0) >= 1, 'Notification mark-seen did not update any record');
    checks.push({ name: 'Farmer marks notification seen', ok: true, detail: `marked=${markSeenPayload.data?.markedCount ?? 0}` });

    const notificationsAfterResponse = await fetch(`${base}/farmer/payments/notifications`, {
      method: 'GET',
      headers: {
        Cookie: farmerCookie,
      },
    });
    const notificationsAfterPayload = (await notificationsAfterResponse.json()) as ApiEnvelope<Array<{ id: string }>>;
    assert(notificationsAfterResponse.status === 200, 'Failed to refetch notifications');
    const notificationsAfter = notificationsAfterPayload.data ?? [];
    const stillVisible = notificationsAfter.some((entry) => entry.id === createdOrderId);
    assert(!stillVisible, 'Notification still visible after mark-seen');
    checks.push({ name: 'Notification disappears after mark-seen', ok: true, detail: `remaining=${notificationsAfter.length}` });

    const farmerPaymentsResponse = await fetch(`${base}/farmer/payments`, {
      method: 'GET',
      headers: {
        Cookie: farmerCookie,
      },
    });
    const farmerPaymentsPayload = (await farmerPaymentsResponse.json()) as ApiEnvelope<
      Array<{ id: string; paymentStatus: string; paidAt: string }>
    >;
    assert(farmerPaymentsResponse.status === 200, 'Failed to fetch farmer payments');
    const farmerPayments = farmerPaymentsPayload.data ?? [];
    const paidRecord = farmerPayments.find((entry) => entry.id === createdOrderId);
    assert(Boolean(paidRecord), 'Paid order missing from /farmer/payments');
    checks.push({ name: 'Farmer payments list includes paid order', ok: true, detail: `records=${farmerPayments.length}` });

    console.log(JSON.stringify({ allPassed: true, checks }, null, 2));
  } finally {
    razorpayService.createOrder = originalCreateOrder;
    razorpayService.fetchOrder = originalFetchOrder;
    razorpayService.fetchPayment = originalFetchPayment;

    if (createdOrderId) {
      await OrderModel.deleteOne({ _id: createdOrderId });
    }
    await MarketplaceListingModel.deleteOne({ _id: listing._id });
    await UserModel.deleteOne({ _id: farmer._id });
    await UserModel.deleteOne({ _id: consumer._id });

    await new Promise<void>((resolve) => server.close(() => resolve()));
    await disconnectDB();
  }
}

void run().catch(async (error: unknown) => {
  console.error('E2E Razorpay full flow check failed', error);
  await disconnectDB();
  process.exitCode = 1;
});
