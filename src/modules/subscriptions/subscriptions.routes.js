// src/modules/subscriptions/subscriptions.routes.js
import express from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import * as ctrl from './subscriptions.controller.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/plans', ctrl.listPlansController);
router.post('/subscribe', ctrl.subscribeController);
router.get('/me/status', ctrl.statusController);
router.post('/me/prepay', ...ctrl.prepayController);

export default router;
