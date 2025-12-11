import express from 'express';
import * as controller from './alerts.controller.js';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import { roleMiddleware } from '../../middleware/roleMiddleware.js';
import {
  validateBody,
  validateQuery,
  validateParams,
  createAlertSchema,
  listAlertsSchema,
  alertIdSchema,
  updateSettingsSchema,
  testEmailSchema,
  testSMSSchema
} from '../../validators/alerts.validators.js';

const router = express.Router();

// All alert routes require authentication
router.use(authMiddleware);

// Test endpoints (admin only, must be before :id route)
router.post('/test/email', roleMiddleware(['admin']), validateBody(testEmailSchema), controller.testEmailHandler);
router.post('/test/sms', roleMiddleware(['admin']), validateBody(testSMSSchema), controller.testSMSHandler);

// Settings endpoints (authenticated users, must be before :id route)
router.get('/settings', controller.getSettingsHandler);
router.patch('/settings', validateBody(updateSettingsSchema), controller.updateSettingsHandler);

// Alert CRUD endpoints
router.post('/', roleMiddleware(['admin', 'fleet_manager']), validateBody(createAlertSchema), controller.createAlertHandler);
router.get('/', validateQuery(listAlertsSchema), controller.listAlertsHandler);
router.get('/:id', validateParams(alertIdSchema), controller.getAlertHandler);
router.delete('/:id', roleMiddleware(['admin']), validateParams(alertIdSchema), controller.deleteAlertHandler);

export default router;
