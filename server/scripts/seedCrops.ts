import { connectDB, disconnectDB } from '../src/config/db.js';
import { seedCropCatalog } from '../src/modules/crop-pricing/crop-pricing.service.js';
import { logger } from '../src/utils/logger.js';

async function run(): Promise<void> {
  await connectDB();
  const result = await seedCropCatalog(true);
  logger.info('Crop seeding completed', result);
}

run()
  .catch((error: unknown) => {
    logger.error('Crop seeding failed', {
      error: error instanceof Error ? error.message : 'Unknown seeding error',
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB();
  });
