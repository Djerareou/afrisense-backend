import { on } from '../core/events/index.js';
import * as subsRepo from '../modules/subscriptions/subscriptions.repository.js';
import * as fw from '../providers/flutterwave/flutterwave.service.js';
import { prisma } from '../config/prismaClient.js';
import logger from '../utils/logger.js';

// Simple auto-topup: when debit fails for a subscription, create an initPayment to topup
on('DEBIT_FAILED', async ({ userId, wallet, amount, error }) => {
  try {
    // fetch subscription to determine plan price
    const sub = await prisma.subscription.findFirst({ where: { userId } , include: { plan: true } });
    const topupAmount = sub && sub.plan ? Math.max(sub.plan.pricePerDay * 3, 1000) : 1000;
    logger.info({ userId, topupAmount }, 'autoTopup:initiating');
    const r = await fw.initPayment(userId, topupAmount, { reason: 'auto_topup' });
    // In production: return init url to client or save payment reference for later webhook
    logger.info({ userId, idemp: r.idempotencyKey }, 'autoTopup:created');
  } catch (e) {
    logger.error({ err: e, userId }, 'autoTopup:error');
  }
});

export default {};
