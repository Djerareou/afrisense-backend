// src/jobs/positionsRetention.job.js
import { prisma } from '../config/prismaClient.js';
import logger from '../utils/logger.js';

const RETENTION_DAYS = 90;

/**
 * Delete positions older than retention period
 */
export async function purgeOldPositions() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  const deleted = await prisma.position.deleteMany({
    where: { timestamp: { lt: cutoff } }
  });

  logger.info({ deletedCount: deleted.count, retentionDays: RETENTION_DAYS }, 'PositionsRetention: purge result');
  return deleted;
}

// Optional: cron scheduling with node-cron
// import cron from 'node-cron';
// cron.schedule('0 0 * * *', purgeOldPositions); // daily at midnight
