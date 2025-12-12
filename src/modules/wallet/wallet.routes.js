// src/modules/wallet/wallet.routes.js
import express from 'express';
import * as ctrl from './wallet.controller.js';
import { authMiddleware } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

// User wallet
router.post('/me', ctrl.createWalletController);
router.get('/me/balance', ctrl.getBalanceController);
router.post('/me/credit', ctrl.addCreditController);
router.post('/me/debit', ctrl.debitController);
router.post('/me/freeze', ctrl.freezeController);

// admin endpoints could be added (create for user, adjust balance)

export default router;
