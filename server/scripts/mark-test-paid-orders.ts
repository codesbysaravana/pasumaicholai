import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.config.js';
import { OrderModel } from '../src/models/order.model.js';

async function run(): Promise<void> {
  await connectDB();
  const idsRaw = process.env.TEST_PAID_ORDER_IDS ?? '';
  const ids = idsRaw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => mongoose.Types.ObjectId.isValid(value))
    .slice(0, 3)
    .map((value) => new mongoose.Types.ObjectId(value));

  if (ids.length === 0) {
    console.info(
      'No valid TEST_PAID_ORDER_IDS supplied. Example: TEST_PAID_ORDER_IDS=id1,id2,id3 npx tsx scripts/mark-test-paid-orders.ts',
    );
    return;
  }

  const result = await OrderModel.updateMany(
    { _id: { $in: ids } },
    {
      $set: {
        paymentStatus: 'paid',
        paymentProvider: 'razorpay',
        paidAt: new Date(),
        farmerNotified: false,
      },
    },
  );

  console.info(`Updated test paid orders: matched=${result.matchedCount}, modified=${result.modifiedCount}`);
}

void run()
  .catch((error: unknown) => {
    console.error('Failed to mark test paid orders', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
