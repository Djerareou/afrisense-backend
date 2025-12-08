import express from 'express';
import * as controller from './alerts.controller.js';
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

// Test endpoints (must be before :id route)
router.post('/test/email', validateBody(testEmailSchema), controller.testEmailHandler);
router.post('/test/sms', validateBody(testSMSSchema), controller.testSMSHandler);

// Settings endpoints (must be before :id route, require authentication)
router.get('/settings', controller.getSettingsHandler);
router.patch('/settings', validateBody(updateSettingsSchema), controller.updateSettingsHandler);

// Alert CRUD endpoints
router.post('/', validateBody(createAlertSchema), controller.createAlertHandler);
router.get('/', validateQuery(listAlertsSchema), controller.listAlertsHandler);
router.get('/:id', validateParams(alertIdSchema), controller.getAlertHandler);
router.delete('/:id', validateParams(alertIdSchema), controller.deleteAlertHandler);

export default router;
