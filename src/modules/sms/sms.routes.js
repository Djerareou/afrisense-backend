/**
 * SMS Routes
 * Public webhook endpoint (no authentication required, but with optional signature validation)
 */

import express from 'express';
import { smsWebhookHandler } from './sms.controller.js';

const router = express.Router();

/**
 * POST /webhooks/sms/receive
 * Public webhook for SMS providers
 * No authentication required (providers send to this endpoint)
 * Optional: Add signature validation in service layer for security
 */
router.post('/receive', smsWebhookHandler);

export default router;
