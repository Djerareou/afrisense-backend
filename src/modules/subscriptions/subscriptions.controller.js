// src/modules/subscriptions/subscription.controller.js
import * as service from './subscriptions.service.js';
import * as repo from './subscriptions.repository.js';

export async function listPlansController(req, res) {
  try {
    const plans = await repo.listPlans();
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
