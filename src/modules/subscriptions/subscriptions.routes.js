// src/modules/subscriptions/subscriptions.routes.js
import express from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import * as ctrl from './subscriptions.controller.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/plans', ctrl.listPlansController);
router.post('/subscribe', ctrl.subscribeController);

export default router;
