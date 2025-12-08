import * as service from './alerts.service.js';
import logger from '../../utils/logger.js';

/**
 * Create a new alert (POST /alerts)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function createAlertHandler(req, res) {
  const payload = req.body;
  try {
    const result = await service.createAlert(payload);
    if (!result) {
      return res.status(204).json({ message: 'Alert skipped (duplicate or disabled)' });
    }
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    logger.error({ err, payload }, 'alerts:create_error');
    return res.status(400).json({ success: false, error: String(err) });
  }
}

/**
 * List alerts with filtering (GET /alerts)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function listAlertsHandler(req, res) {
  try {
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
    return res.json({ success: true, data: items, count: items.length });
  } catch (err) {
    logger.error({ err }, 'alerts:list_error');
    return res.status(400).json({ success: false, error: String(err) });
  }
}

/**
 * Get a single alert by ID (GET /alerts/:id)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function getAlertHandler(req, res) {
  try {
    const id = req.params.id;
    const alert = await service.getAlertById(id);
    return res.json({ success: true, data: alert });
  } catch (err) {
    logger.error({ err, id: req.params.id }, 'alerts:get_error');
    return res.status(404).json({ success: false, error: String(err) });
  }
}

/**
 * Delete an alert (DELETE /alerts/:id)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function deleteAlertHandler(req, res) {
  try {
    const id = req.params.id;
    await service.deleteAlert(id);
    return res.json({ success: true, message: 'Alert deleted' });
  } catch (err) {
    logger.error({ err, id: req.params.id }, 'alerts:delete_error');
    return res.status(400).json({ success: false, error: String(err) });
  }
}

/**
 * Get alert settings for current user (GET /alerts/settings)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function getSettingsHandler(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    
    const settings = await service.getAlertSettings(userId);
    return res.json({ success: true, data: settings });
  } catch (err) {
    logger.error({ err }, 'alerts:get_settings_error');
    return res.status(400).json({ success: false, error: String(err) });
  }
}

/**
 * Update alert settings for current user (PATCH /alerts/settings)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function updateSettingsHandler(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    
    const updated = await service.updateAlertSettings(userId, req.body);
    return res.json({ success: true, data: updated });
  } catch (err) {
    logger.error({ err }, 'alerts:update_settings_error');
    return res.status(400).json({ success: false, error: String(err) });
  }
}

/**
 * Test email notification (POST /alerts/test/email)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function testEmailHandler(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    
    const result = await service.testEmailNotification(email);
    if (result.success) {
      return res.json({ success: true, message: 'Test email sent', data: result.result });
    } else {
      return res.status(500).json({ success: false, error: result.error });
    }
  } catch (err) {
    logger.error({ err }, 'alerts:test_email_error');
    return res.status(500).json({ success: false, error: String(err) });
  }
}

/**
 * Test SMS notification (POST /alerts/test/sms)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function testSMSHandler(req, res) {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: 'Phone number is required' });
    }
    
    const result = await service.testSMSNotification(phoneNumber);
    if (result.success) {
      return res.json({ success: true, message: 'Test SMS sent', data: result.result });
    } else {
      return res.status(500).json({ success: false, error: result.error });
    }
  } catch (err) {
    logger.error({ err }, 'alerts:test_sms_error');
    return res.status(500).json({ success: false, error: String(err) });
  }
}
