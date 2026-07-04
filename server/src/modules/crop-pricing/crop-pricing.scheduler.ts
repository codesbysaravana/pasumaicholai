import cron from 'node-cron';
import { logger } from '../../utils/logger.js';
import { recalculateAllCropPrices } from './crop-pricing.service.js';

let schedulerStarted = false;

export function startCropPricingScheduler(): void {
  if (schedulerStarted) {
    return;
  }

  schedulerStarted = true;
  cron.schedule('0 */6 * * *', async () => {
    try {
      await recalculateAllCropPrices();
      logger.info('Scheduled crop pricing recalculation completed');
    } catch (error) {
      logger.error('Scheduled crop pricing recalculation failed', {
        error: error instanceof Error ? error.message : 'Unknown scheduler error',
      });
    }
  });

  logger.info('Crop pricing scheduler started', { cron: '0 */6 * * *' });
}
