import * as service from './alerts.service.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { BadRequestError, UnauthorizedError, InternalServerError } from '../../utils/errors.js';

/**
 * Create a new alert (POST /alerts)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export const createAlertHandler = asyncHandler(async (req, res) => {
  const result = await service.createAlert(req.body);
  
  if (!result) {
    return res.status(204).json({ message: 'Alert skipped (duplicate or disabled)' });
  }
  
  res.status(201).json({ success: true, data: result });
});

/**
 * List alerts with filtering (GET /alerts)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export const listAlertsHandler = asyncHandler(async (req, res) => {
  const filter = {
    type: req.query.type,
    trackerId: req.query.trackerId,
    geofenceId: req.query.geofenceId,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo
  };
  
  // Remove undefined values
  Object.keys(filter).forEach(key => filter[key] === undefined && delete filter[key]);
  
  const skip = parseInt(req.query.skip || '0', 10);
  const take = parseInt(req.query.take || '50', 10);
  
  const items = await service.getAlerts(filter, { skip, take });
  res.json({ success: true, data: items, count: items.length });
});

/**
 * Get a single alert by ID (GET /alerts/:id)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export const getAlertHandler = asyncHandler(async (req, res) => {
  const alert = await service.getAlertById(req.params.id);
  res.json({ success: true, data: alert });
});

/**
 * Delete an alert (DELETE /alerts/:id)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export const deleteAlertHandler = asyncHandler(async (req, res) => {
  await service.deleteAlert(req.params.id);
  res.json({ success: true, message: 'Alert deleted' });
});

/**
 * Get alert settings for current user (GET /alerts/settings)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export const getSettingsHandler = asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    throw new UnauthorizedError('Authentication required');
  }
  
  const settings = await service.getAlertSettings(req.user.id);
  res.json({ success: true, data: settings });
});

/**
 * Update alert settings for current user (PATCH /alerts/settings)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export const updateSettingsHandler = asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    throw new UnauthorizedError('Authentication required');
  }
  
  const updated = await service.updateAlertSettings(req.user.id, req.body);
  res.json({ success: true, data: updated });
});

/**
 * Test email notification (POST /alerts/test/email)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export const testEmailHandler = asyncHandler(async (req, res) => {
  const result = await service.testEmailNotification(req.body.email);
  
  if (result.success) {
    res.json({ success: true, message: 'Test email sent', data: result.result });
  } else {
    throw new InternalServerError(result.error);
  }
});

/**
 * Test SMS notification (POST /alerts/test/sms)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export const testSMSHandler = asyncHandler(async (req, res) => {
  const result = await service.testSMSNotification(req.body.phoneNumber);
  
  if (result.success) {
    res.json({ success: true, message: 'Test SMS sent', data: result.result });
  } else {
    throw new InternalServerError(result.error);
  }
});
