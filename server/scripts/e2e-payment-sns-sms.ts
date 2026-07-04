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

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function parseArg(name: string, fallback = ''): string {
  const idx = process.argv.findIndex((arg) => arg === name);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] ?? fallback;
}

async function run(): Promise<void> {
  const phone = parseArg('--phone', '').replace(/\s+/g, '');
  if (!phone) {
    throw new Error('Usage: tsx scripts/e2e-payment-sns-sms.ts --phone +916383765537');
  }

  if (!process.env.SNS_SMS_ENABLED) {
    process.env.SNS_SMS_ENABLED = 'true';
  }
  if (!process.env.SMS_DEFAULT_COUNTRY_CODE) {
    process.env.SMS_DEFAULT_COUNTRY_CODE = '+91';
  }

  await connectDB();

  const server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to open local test server');
  }
  const base = `http://127.0.0.1:${address.port}/api/v1`;

  const farmer = await UserModel.findOne({ role: 'farmer' }).sort({ createdAt: 1 });
  const consumer = await UserModel.findOne({ role: 'consumer' }).sort({ createdAt: 1 });
  if (!farmer || !consumer) {
    throw new Error('Need at least one farmer and one consumer user in DB');
  }

  const farmerOriginal = { mobile: farmer.mobile, phone: farmer.phone };
  const consumerOriginal = { mobile: consumer.mobile, phone: consumer.phone };

  await UserModel.updateOne(
    { _id: farmer._id },
    {
      $set: {
        mobile: phone,
        phone,
      },
    },
  );
  await UserModel.updateOne(
    { _id: consumer._id },
    {
      $set: {
        mobile: phone,
        phone,
      },
    },
  );

  const runId = Date.now();
  const listing = await MarketplaceListingModel.create({
    farmerId: String(farmer._id),
    farmer: {
      name: farmer.fullName,
      phone: phone,
      location: 'Chennai',
    },
    cropName: 'SNS E2E Tomato',
    productName: 'SNS E2E Tomato',
    category: 'vegetable',
    quantity: 5,
    quantityAvailable: 5,
    pricePerKg: 99,
    harvestDate: new Date(),
    description: `SNS e2e payment flow ${runId}`,
    location: 'Chennai',
    images: [],
    unit: 'kg',
    isActive: true,
    status: 'active',
  });

  const consumerCookie = `${getAuthCookieName()}=${signAccessToken(String(consumer._id), 'consumer')}`;

  const originalCreateOrder = razorpayService.createOrder.bind(razorpayService);
  const originalFetchOrder = razorpayService.fetchOrder.bind(razorpayService);
  const originalFetchPayment = razorpayService.fetchPayment.bind(razorpayService);

  const mockedOrderId = `order_sms_e2e_${runId}`;
  const mockedPaymentId = `pay_sms_e2e_${runId}`;
  const expectedAmount = 2 * 99 * 100;

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
          phone: phone,
          location: 'Chennai',
        },
      }),
    });
    const createOrderPayload = (await createOrderResponse.json()) as ApiEnvelope<{
      checkout_token: string;
    }>;
    assert(createOrderResponse.status === 200, `create-order failed: ${createOrderPayload.message ?? createOrderResponse.status}`);
    const checkoutToken = createOrderPayload.data?.checkout_token ?? '';
    assert(Boolean(checkoutToken), 'Missing checkout token');

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
    const verifyPayload = (await verifyResponse.json()) as ApiEnvelope<{ orderId: string; paymentStatus: string }>;
    assert(verifyResponse.status === 200, `verify failed: ${verifyPayload.message ?? verifyResponse.status}`);
    createdOrderId = verifyPayload.data?.orderId ?? '';
    assert(Boolean(createdOrderId), 'verify did not return order id');

    const savedOrder = await OrderModel.findById(createdOrderId).lean();
    assert(Boolean(savedOrder), 'Order not persisted');
    assert(savedOrder?.paymentStatus === 'paid', 'Order paymentStatus is not paid');

    console.log(
      JSON.stringify(
        {
          allPassed: true,
          message: 'Payment completion flow executed. SNS SMS dispatch attempted for consumer and farmer.',
          phone,
          orderId: createdOrderId,
        },
        null,
        2,
      ),
    );
  } finally {
    razorpayService.createOrder = originalCreateOrder;
    razorpayService.fetchOrder = originalFetchOrder;
    razorpayService.fetchPayment = originalFetchPayment;

    if (createdOrderId) {
      await OrderModel.deleteOne({ _id: createdOrderId });
    }
    await MarketplaceListingModel.deleteOne({ _id: listing._id });

    await UserModel.updateOne(
      { _id: farmer._id },
      {
        $set: {
          mobile: farmerOriginal.mobile ?? '',
          phone: farmerOriginal.phone ?? '',
        },
      },
    );
    await UserModel.updateOne(
      { _id: consumer._id },
      {
        $set: {
          mobile: consumerOriginal.mobile ?? '',
          phone: consumerOriginal.phone ?? '',
        },
      },
    );

    await new Promise<void>((resolve) => server.close(() => resolve()));
    await disconnectDB();
  }
}

void run().catch(async (error: unknown) => {
  console.error('E2E payment SNS SMS test failed', error);
  await disconnectDB();
  process.exitCode = 1;
});
