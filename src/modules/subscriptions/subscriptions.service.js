// src/modules/subscriptions/subscription.service.js
import * as repo from './subscriptions.repository.js';
import * as walletService from '../wallet/wallet.service.js';
import { prisma } from '../../config/prismaClient.js';
import { emit } from '../../core/events/index.js';
import cache from '../../core/cache.js';

/**
 * subscribe user to plan
 */
export async function subscribeUser(userId, planKey) {
  const plan = await repo.findPlanByKey(planKey);
  if (!plan) throw new Error('Plan not found');
  // create subscription if not exists
  let sub = await repo.findSubscriptionByUser(userId);
  if (!sub) {
    // compute trial end date if plan provides a free trial
    let trialEndsAt = null;
    try {
      const freeDays = typeof plan.freeTrialDays === 'number' ? plan.freeTrialDays : (plan.freeTrialDays ? Number(plan.freeTrialDays) : 0);
      if (freeDays && freeDays > 0) {
        trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + freeDays);
      }
    } catch (e) {
      trialEndsAt = null;
    }

    sub = await repo.createSubscription(userId, plan.id, new Date(), trialEndsAt);
  } else {
    sub = await repo.updateSubscription(userId, { planId: plan.id, active: true });
  }
  return sub;
}

export async function listPlansCached() {
  const cacheKey = 'plans:all';
  const cached = await cache.cacheGet(cacheKey);
  if (cached) return cached;
  const plans = await repo.listPlans();
  await cache.cacheSet(cacheKey, plans, 60 * 60 * 24); // 24h
  return plans;
}

export async function prepaySubscription(userId, days, planKey = null) {
  const sub = await repo.findSubscriptionByUser(userId);
  const plan = planKey ? await repo.findPlanByKey(planKey) : (sub ? await repo.findPlanById(sub.planId) : null);
  if (!plan) throw new Error('Plan not found');
  const cost = plan.pricePerDay * days;
  // bonus: if paying 30 or more days, give 5% extra days
  let bonusDays = 0;
  if (days >= 30) bonusDays = Math.floor(days * 0.05);
  // attempt to debit wallet
  await walletService.debit(userId, cost, { reason: 'prepay_subscription', days, planId: plan.id });

  const prepaidUntil = new Date();
  prepaidUntil.setDate(prepaidUntil.getDate() + days + bonusDays);

  if (!sub) {
    // create subscription with prepaidUntil
    const created = await repo.createSubscription(userId, plan.id);
    await repo.updateSubscription(userId, { prepaidUntil });
    return { subscription: created, prepaidUntil };
  }

  const updated = await repo.updateSubscription(userId, { prepaidUntil });
  return { subscription: updated, prepaidUntil };
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
      // If the subscription is currently in a free trial period, skip charging
      if (s.trialEndsAt && new Date() < new Date(s.trialEndsAt)) {
        results.push({ subscriptionId: s.id, status: 'in_trial' });
        continue;
      }
      const w = await walletService.createWalletIfNotExists(s.userId);
      if (w.frozen) {
        results.push({ subscriptionId: s.id, status: 'wallet_frozen' });
        continue;
      }

      // If balance insufficient -> retry logic
      if (w.balance < s.plan.pricePerDay) {
        // emit DEBIT_FAILED so auto-topup jobs/listeners can react
        try {
          emit('DEBIT_FAILED', { userId: s.userId, wallet: w, amount: s.plan.pricePerDay, reason: 'insufficient_funds' });
        } catch (e) {}
        const nextRetry = (s.retryCount || 0) + 1;
        const updateData = { retryCount: nextRetry, lastRetryAt: new Date() };
        // if we've exhausted retries, suspend subscription
        if (nextRetry >= 3) {
          updateData.active = false;
          updateData.suspendedAt = new Date();
          updateData.suspensionReason = 'insufficient_funds_after_retries';
          results.push({ subscriptionId: s.id, status: 'suspended' });
          await prisma.subscription.update({ where: { id: s.id }, data: updateData });
          emit('SUBSCRIPTION_SUSPENDED', { userId: s.userId, subscription: { id: s.id }, reason: updateData.suspensionReason });
        } else {
          await prisma.subscription.update({ where: { id: s.id }, data: updateData });
          results.push({ subscriptionId: s.id, status: 'insufficient_funds_retry', retry: nextRetry });
        }
        continue;
      }

      // debit wallet
      await walletService.debit(s.userId, s.plan.pricePerDay, { reason: 'daily_subscription', subscriptionId: s.id });

      // update lastChargedAt and reset retry counters
      await prisma.subscription.update({ where: { id: s.id }, data: { lastChargedAt: new Date(), retryCount: 0, lastRetryAt: null } });
      results.push({ subscriptionId: s.id, status: 'charged' });
    } catch (err) {
      results.push({ subscriptionId: s.id, status: 'error', error: err.message });
    }
  }

  return results;
}

export async function reactivateSubscription(userId) {
  const sub = await prisma.subscription.findFirst({ where: { userId } , include: { plan: true } });
  if (!sub) throw new Error('Subscription not found');
  if (!sub.active) {
    const w = await walletService.createWalletIfNotExists(userId);
    if (w.balance >= sub.plan.pricePerDay) {
      const updated = await prisma.subscription.update({ where: { id: sub.id }, data: { active: true, suspendedAt: null, suspensionReason: null, retryCount: 0 } });
      emit('SUBSCRIPTION_REACTIVATED', { userId, subscription: updated });
      return updated;
    }
    throw new Error('Insufficient balance to reactivate');
  }
  return sub;
}
