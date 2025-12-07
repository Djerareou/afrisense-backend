import { prisma } from '../../config/prismaClient.js';
import logger from '../../utils/logger.js';

/**
 * Purge positions older than `retentionDays` days.
 * @param {number} retentionDays
 */
export async function purgeOldPositions(retentionDays = 10) {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  try {
    const res = await prisma.position.deleteMany({ where: { timestamp: { lt: cutoff } } });
    logger.info({ action: 'PURGE_OLD_POSITIONS', retentionDays, deleted: res.count });
    return res.count;
  } catch (err) {
    logger.error({ action: 'PURGE_OLD_POSITIONS_FAIL', error: err?.message });
    throw err;
  }
}

// Optional: run when invoked directly (node src/modules/positions/cleanup.js)
if (import.meta.url === `file://${process.cwd()}/src/modules/positions/cleanup.js`) {
  purgeOldPositions().then(() => process.exit(0)).catch(() => process.exit(1));
}
