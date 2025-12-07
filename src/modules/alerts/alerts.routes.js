import express from 'express';
import * as controller from './alerts.controller.js';

const router = express.Router();

router.post('/', controller.createAlertHandler);
router.get('/', controller.listAlertsHandler);
router.patch('/:id/status', controller.updateAlertStatusHandler);
router.get('/settings', controller.getSettingsHandler);
router.patch('/settings', controller.updateSettingsHandler);

export default router;
