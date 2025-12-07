import express from 'express';
import * as controller from './alerts.controller.js';

const router = express.Router();

// Test endpoints (must be before :id route)
router.post('/test/email', controller.testEmailHandler);   // Test email notification
router.post('/test/sms', controller.testSMSHandler);       // Test SMS notification

// Settings endpoints (must be before :id route, require authentication)
router.get('/settings', controller.getSettingsHandler);    // Get user alert settings
router.patch('/settings', controller.updateSettingsHandler); // Update user alert settings

// Alert CRUD endpoints
router.post('/', controller.createAlertHandler);           // Create alert
router.get('/', controller.listAlertsHandler);             // List alerts (filterable)
router.get('/:id', controller.getAlertHandler);            // Get single alert
router.delete('/:id', controller.deleteAlertHandler);      // Delete alert

export default router;
