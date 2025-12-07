// src/modules/trackers/trackers.routes.js (ESM)
import express from 'express';
import * as controller from './trackers.controller.js';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import { roleMiddleware } from '../../middleware/roleMiddleware.js';

const router = express.Router();

// require authentication for all tracker routes
router.use(authMiddleware);

// Create: owners and fleet managers can register trackers
router.post('/', roleMiddleware(['owner', 'fleet_manager', 'admin']), controller.create);
// List: managers and admins can list; owners can list their own in service
router.get('/', roleMiddleware(['owner', 'fleet_manager', 'admin']), controller.list);

router.get('/:id', roleMiddleware(['owner', 'fleet_manager', 'admin']), controller.getOne);
// Allow owners to update/delete their own trackers; route RBAC allows owners too.
router.put('/:id', roleMiddleware(['owner', 'fleet_manager', 'admin']), controller.update);
router.delete('/:id', roleMiddleware(['owner', 'admin']), controller.remove);

export default router;
