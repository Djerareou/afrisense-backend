// src/modules/subscriptions/subscription.controller.js
import * as service from './subscriptions.service.js';
import * as repo from './subscriptions.repository.js';
import { z } from 'zod';
import { validateBody } from '../../middleware/validate.js';

const prepaySchema = z.object({ planKey: z.string().optional(), days: z.number().int().positive() });

export async function listPlansController(req, res) {
  try {
    const plans = await service.listPlansCached();
    return res.json({ success: true, data: plans });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function subscribeController(req, res) {
  try {
    const userId = req.user.userId;
    const { planKey } = req.body;
    const sub = await service.subscribeUser(userId, planKey);
    return res.json({ success: true, data: sub });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}

export async function statusController(req, res) {
  try {
    const userId = req.user.userId;
    const sub = await repo.findSubscriptionByUser(userId);
    if (!sub) return res.status(404).json({ success: false, error: 'No subscription' });
    const plan = await repo.findPlanById(sub.planId);
    const balance = await (await import('../wallet/wallet.service.js')).getBalance(userId);
    const estimatedDaysLeft = plan && plan.pricePerDay ? Math.floor(balance / plan.pricePerDay) : null;
    const inTrial = !!(sub.trialEndsAt && new Date() < new Date(sub.trialEndsAt));
    return res.json({ success: true, data: { balance, plan, costPerDay: plan?.pricePerDay, estimatedDaysLeft, trialEndsAt: sub.trialEndsAt || null, inTrial } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export const prepayController = [validateBody(prepaySchema), async function (req, res) {
  try {
    const userId = req.user.userId;
    const { days, planKey } = req.body;
    const result = await service.prepaySubscription(userId, days, planKey);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}];
