// src/modules/positions/positions.routes.js
import express from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import {
  createManual,
  ingestTraccarWebhook,
  getPositions,
  getOnePosition,
  syncPositions,
} from './positions.controller.js';

const router = express.Router();

// Manual insertion (for tests & imports) - protected by user token
router.post('/', authMiddleware, createManual);

// Bulk ingestion (you can add a separate bulk route mapped in controller/service) - protected
router.post('/bulk', authMiddleware, async (req, res) => {
  // simple wrapper to reuse service.ingestPositionsBulk
  try {
    const userContext = { userId: req.user?.userId, role: req.user?.role };
    const result = await (await import('./positions.service.js')).ingestPositionsBulk(req.body, userContext);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Batch sync endpoint for offline tracker buffer recovery - protected
router.post('/sync', authMiddleware, syncPositions);

// Traccar webhook - you may protect with an API key or allow system role
router.post('/webhook/traccar', authMiddleware, ingestTraccarWebhook);

// Query endpoints
router.get('/', authMiddleware, getPositions);
router.get('/:id', authMiddleware, getOnePosition);

export default router;
