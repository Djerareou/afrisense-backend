import express from 'express';
import { webhookHandler, initPaymentController } from './flutterwave.controller.js';
import { authMiddleware } from '../../middleware/authMiddleware.js';

const router = express.Router();

// webhook endpoint (no auth)
router.post('/flutterwave', webhookHandler);

// init endpoint (protected) - minimal
router.post('/flutterwave/init', authMiddleware, initPaymentController);

export default router;
