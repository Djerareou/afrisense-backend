import express from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import { roleMiddleware } from '../../middleware/roleMiddleware.js';
import {
  createController, listController, getController,
  updateController, deleteController,
  assignController, unassignController
} from './geofences.controller.js';

const router = express.Router();
router.use(authMiddleware);

router.post('/', roleMiddleware(['admin','fleet_manager']), createController);
router.get('/', listController);
router.get('/:id', getController);
router.put('/:id', roleMiddleware(['admin','fleet_manager']), updateController);
router.delete('/:id', roleMiddleware(['admin','fleet_manager']), deleteController);
router.post('/:id/assign', roleMiddleware(['admin','fleet_manager']), assignController);
router.post('/:id/unassign', roleMiddleware(['admin','fleet_manager']), unassignController);

export default router;
