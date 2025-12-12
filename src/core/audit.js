import { prisma } from '../config/prismaClient.js';
import events from './events/index.js';

export async function logAudit({ userId = null, action, targetModel = null, targetId = null, beforeData = null, afterData = null, ip = null }) {
  try {
    await prisma.auditTrail.create({
      data: { userId, action, targetModel, targetId, beforeData, afterData, ip },
    });
  } catch (err) {
    // best-effort: don't break main flow
    console.error('Audit log failed', err.message);
  }
}

// wire some basic listeners
events.on('PAYMENT_SUCCESS', async ({ userId, payment }) => {
  await logAudit({ userId, action: 'PAYMENT_SUCCESS', targetModel: 'PaymentRecord', targetId: payment.id, afterData: payment });
});

events.on('SUBSCRIPTION_SUSPENDED', async ({ userId, subscription, reason }) => {
  await logAudit({ userId, action: 'SUBSCRIPTION_SUSPENDED', targetModel: 'Subscription', targetId: subscription.id, afterData: subscription, ip: null });
});

export default { logAudit };
