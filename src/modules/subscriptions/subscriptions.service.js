// src/modules/subscriptions/subscription.service.js
import * as repo from './subscriptions.repository.js';
import * as walletService from '../wallet/wallet.service.js';
import { prisma } from '../../config/prismaClient.js';

/**
 * subscribe user to plan
 */
export async function subscribeUser(userId, planKey) {
  const plan = await repo.findPlanByKey(planKey);
  if (!plan) throw new Error('Plan not found');
  // create subscription if not exists
  let sub = await repo.findSubscriptionByUser(userId);
  if (!sub) {
    sub = await repo.createSubscription(userId, plan.id);
  } else {
    sub = await repo.updateSubscription(userId, { planId: plan.id, active: true });
  }
  return sub;
}

/**
 * dailyCronJob: iterate active subscriptions and debit pricePerDay from wallet
 * - if wallet insufficient: mark subscription active=false? or suspend but keep record
 * - on success: update lastChargedAt
 *
 * Configurable behaviour:
 * - suspendOnFail = true -> if insufficient, set active = false and set "suspendedAt"
 * - holdAsPassive = true -> keep system ability to track but limit frontend access
 */
export async function dailyChargeAll() {
  const activeSubs = await prisma.subscription.findMany({ where: { active: true }, include: { plan: true } });
  const results = [];
  for (const s of activeSubs) {
    try {
      // check wallet
      const w = await walletService.createWalletIfNotExists(s.userId);
      if (w.frozen) {
        // skip or log
        results.push({ subscriptionId: s.id, status: 'wallet_frozen' });
        continue;
      }
      if (w.balance < s.plan.pricePerDay) {
        // insufficient: suspend or set passive mode
        await prisma.subscription.update({ where: { id: s.id }, data: { active: false } });
        results.push({ subscriptionId: s.id, status: 'insufficient_funds' });
        // Optionally create an Alert (integration)
        continue;
      }

      // debit wallet
      await walletService.debit(s.userId, s.plan.pricePerDay, { reason: 'daily_subscription', subscriptionId: s.id });

      // update lastChargedAt
      await prisma.subscription.update({ where: { id: s.id }, data: { lastChargedAt: new Date() } });

      results.push({ subscriptionId: s.id, status: 'charged' });
    } catch (err) {
      results.push({ subscriptionId: s.id, status: 'error', error: err.message });
    }
  }
  return results;
}
