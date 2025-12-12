// src/modules/wallet/wallet.controller.js
import * as service from './wallet.service.js';

export async function createWalletController(req, res) {
  try {
    const userId = req.params.userId || req.user?.userId;
    const w = await service.createWalletIfNotExists(userId);
    return res.status(201).json({ success: true, data: w });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}

export async function getBalanceController(req, res) {
  try {
    const userId = req.params.userId || req.user?.userId;
    const balance = await service.getBalance(userId);
    return res.json({ success: true, data: { balance } });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}

export async function addCreditController(req, res) {
  try {
    const userId = req.params.userId || req.user?.userId;
    const { amount, metadata } = req.body;
    const updated = await service.addCredit(userId, Number(amount), metadata || {});
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}

export async function debitController(req, res) {
  try {
    const userId = req.params.userId || req.user?.userId;
    const { amount, metadata } = req.body;
    const updated = await service.debit(userId, Number(amount), metadata || {});
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}

export async function freezeController(req, res) {
  try {
    const userId = req.params.userId || req.user?.userId;
    const { freeze } = req.body;
    const w = await service.setFreeze(userId, !!freeze);
    return res.json({ success: true, data: w });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}

export async function redeemPointsController(req, res, next) {
  try {
    const userId = req.user.userId;
    const { points } = req.body;
    const result = await service.redeemPoints(userId, Number(points));
    return res.json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
}
