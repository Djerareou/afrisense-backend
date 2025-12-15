// src/jobs/subscriptionCron.js
import cron from 'node-cron';
import { dailyChargeAll } from '../modules/subscriptions/subscriptions.service.js';
import pino from 'pino';
const logger = pino();

export function startSubscriptionCron() {
  // run daily at 00:05 server time
  cron.schedule('5 0 * * *', async () => {
    logger.info('Running daily subscription charge job');
    try {
      const res = await dailyChargeAll();
      logger.info({ res }, 'Daily charge results');
    } catch (err) {
      logger.error({ err }, 'Daily charge job failed');
    }
  });
}
