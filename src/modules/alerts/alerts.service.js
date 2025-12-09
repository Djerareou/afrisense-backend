import * as repo from './alerts.repository.js';
import { AlertType } from './alerts.enums.js';
import logger from '../../utils/logger.js';
import * as notifications from './notifications.js';
import { prisma } from '../../config/prismaClient.js';
import { NotFoundError, BadRequestError, ValidationError } from '../../utils/errors.js';

// Duplicate prevention window (configurable via env, default 2 minutes)
const DUPLICATE_WINDOW_MS = parseInt(process.env.ALERT_DUPLICATE_WINDOW_SECONDS || '120', 10) * 1000;

/**
 * Send notification through a channel (non-blocking)
 * @param {string} channel - Notification channel
 * @param {Object} alert - Alert object
 * @param {Object} user - User object with email/phone
 * @returns {Promise<Object>} Send result
 */
async function sendNotification(channel, alert, user) {
  try {
    const subject = `Alert: ${alert.type}`;
    let body = `Alert detected for tracker ${alert.tracker?.label || alert.trackerId}.\n`;
    body += `Type: ${alert.type}\n`;
    body += `Time: ${alert.timestamp}\n`;
    
    if (alert.geofence) {
      body += `Geofence: ${alert.geofence.name}\n`;
    }
    
    if (alert.meta) {
      body += `Details: ${JSON.stringify(alert.meta)}\n`;
    }

    let target = null;
    if (channel === 'EMAIL') {
      target = user?.email || process.env.DEFAULT_ALERT_EMAIL;
    } else if (channel === 'SMS') {
      target = user?.phone || process.env.DEFAULT_ALERT_PHONE;
    }

    if (!target && channel !== 'CONSOLE') {
      throw new Error(`No ${channel} target configured`);
    }

    const result = await notifications.send(channel, target, subject, body);
    return { status: 'success', providerRef: result?.id || JSON.stringify(result) };
  } catch (err) {
    logger.error({ err, channel, alertId: alert.id }, 'alerts:notification_error');
    return { status: 'failure', error: String(err) };
  }
}

/**
 * Check for duplicate alerts within time window
 * @param {Object} criteria - Alert criteria
 * @returns {Promise<boolean>} True if duplicate exists
 */
async function isDuplicate(criteria) {
  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS);
  const recent = await repo.findRecentSimilarAlerts(criteria, since);
  return recent.length > 0;
}

/**
 * Get user from tracker
 * @param {string} trackerId - Tracker ID
 * @returns {Promise<Object>} User object
 */
async function getUserFromTracker(trackerId) {
  const tracker = await prisma.tracker.findUnique({
    where: { id: trackerId },
    include: { user: true }
  });
  
  if (!tracker) {
    throw new NotFoundError('Tracker');
  }
  
  return tracker.user;
}

/**
 * Create a new alert
 * @param {Object} payload - Alert data
 * @param {Object} userContext - User context { userId, role }
 * @returns {Promise<Object|null>} Created alert or null if skipped
 */
export async function createAlert(payload, userContext = {}) {
  const { trackerId, type, positionId, geofenceId = null, meta = {} } = payload;

  // Validation
  if (!trackerId) throw new BadRequestError('trackerId is required');
  if (!type) throw new BadRequestError('type is required');
  if (!positionId) throw new BadRequestError('positionId is required');
  if (!Object.values(AlertType).includes(type)) {
    throw new ValidationError(`Invalid alert type: ${type}`);
  }

  // Verify tracker exists and check ownership for non-admins
  const tracker = await prisma.tracker.findUnique({ 
    where: { id: trackerId },
    include: { user: true }
  });
  if (!tracker) throw new NotFoundError('Tracker');
  
  // Check permissions: admin/fleet_manager can create for any tracker
  // Regular users cannot manually create alerts
  if (userContext.role && !['admin', 'fleet_manager'].includes(userContext.role)) {
    throw new BadRequestError('Insufficient permissions to create alerts');
  }

  // Verify position exists
  const position = await prisma.position.findUnique({ where: { id: positionId } });
  if (!position) throw new NotFoundError('Position');

  // Check for duplicates
  const criteria = { trackerId, type, geofenceId };
  if (await isDuplicate(criteria)) {
    logger.info({ trackerId, type, geofenceId }, 'alerts:duplicate_skipped');
    return null;
  }

  // Get user for notification settings
  const user = tracker.user;
  const settings = await repo.getAlertSettings(user.id);

  // Check if alerts are enabled for this user
  if (settings && settings.enabled === false) {
    logger.info({ userId: user.id, type }, 'alerts:disabled_for_user');
    return null;
  }

  // Persist alert
  const alertData = {
    trackerId,
    type,
    positionId,
    geofenceId,
    meta: meta && Object.keys(meta).length > 0 ? JSON.stringify(meta) : null
  };
  
  const stored = await repo.createAlert(alertData);

  // Send notifications asynchronously (non-blocking)
  // Wrap in setImmediate with proper error handling to prevent unhandled rejections
  setImmediate(() => {
    (async () => {
      try {
        // Determine channels from settings or defaults
        let channels = ['CONSOLE'];
        if (settings && settings.channels) {
          const channelConfig = typeof settings.channels === 'string' 
            ? JSON.parse(settings.channels) 
            : settings.channels;
          
          channels = Object.entries(channelConfig)
            .filter(([_, enabled]) => enabled)
            .map(([channel, _]) => channel.toUpperCase());
        }

        // Send to each enabled channel
        for (const channel of channels) {
          const result = await sendNotification(channel, stored, user);
          await repo.createDeliveryLog({
            alertId: stored.id,
            channel,
            status: result.status,
            providerRef: result.providerRef || null,
            error: result.error || null
          });
        }
      } catch (err) {
        logger.error({ err, alertId: stored.id }, 'alerts:notification_dispatch_error');
      }
    })();
  });

  return stored;
}

/**
 * Get alerts with filtering
 * @param {Object} filter - Filter criteria
 * @param {Object} options - Pagination options
 * @param {Object} userContext - User context { userId, role }
 * @returns {Promise<Array>} List of alerts
 */
export async function getAlerts(filter = {}, options = {}, userContext = {}) {
  // For non-admin users, filter by their trackers only
  if (userContext.userId && userContext.role !== 'admin') {
    // Get user's trackers
    const userTrackers = await prisma.tracker.findMany({
      where: { userId: userContext.userId },
      select: { id: true }
    });
    
    const trackerIds = userTrackers.map(t => t.id);
    
    // If user has specific trackerId in filter, verify ownership
    if (filter.trackerId && !trackerIds.includes(filter.trackerId)) {
      throw new BadRequestError('Access denied to this tracker');
    }
    
    // Add userId filter to restrict to user's trackers
    filter.userTrackerIds = trackerIds;
  }
  
  return repo.findAlerts(filter, options);
}

/**
 * Get a single alert by ID
 * @param {string} id - Alert ID
 * @param {Object} userContext - User context { userId, role }
 * @returns {Promise<Object>} Alert object
 */
export async function getAlertById(id, userContext = {}) {
  const alert = await repo.findAlertById(id);
  if (!alert) throw new NotFoundError('Alert');
  
  // Check ownership for non-admin users
  if (userContext.userId && userContext.role !== 'admin') {
    const tracker = await prisma.tracker.findUnique({
      where: { id: alert.trackerId }
    });
    
    if (!tracker || tracker.userId !== userContext.userId) {
      throw new BadRequestError('Access denied to this alert');
    }
  }
  
  return alert;
}

/**
 * Delete an alert
 * @param {string} id - Alert ID
 * @returns {Promise<Object>} Deleted alert
 */
export async function deleteAlert(id) {
  const alert = await repo.findAlertById(id);
  if (!alert) throw new NotFoundError('Alert');
  return repo.deleteAlert(id);
}

/**
 * Get alert settings for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Alert settings
 */
export async function getAlertSettings(userId) {
  return repo.getAlertSettings(userId);
}

/**
 * Update alert settings for a user
 * @param {string} userId - User ID
 * @param {Object} data - Settings data
 * @returns {Promise<Object>} Updated settings
 */
export async function updateAlertSettings(userId, data) {
  const payload = { ...data };
  
  // Convert channels object to JSON string if needed
  if (payload.channels && typeof payload.channels !== 'string') {
    payload.channels = JSON.stringify(payload.channels);
  }
  
  // Convert thresholds object to JSON string if needed
  if (payload.thresholds && typeof payload.thresholds !== 'string') {
    payload.thresholds = JSON.stringify(payload.thresholds);
  }
  
  return repo.updateAlertSettings(userId, payload);
}

/**
 * Test email notification
 * @param {string} email - Test email address
 * @returns {Promise<Object>} Test result
 */
export async function testEmailNotification(email) {
  try {
    const result = await notifications.testEmail(email);
    return { success: true, result };
  } catch (err) {
    logger.error({ err, email }, 'alerts:test_email_error');
    return { success: false, error: String(err) };
  }
}

/**
 * Test SMS notification
 * @param {string} phoneNumber - Test phone number
 * @returns {Promise<Object>} Test result
 */
export async function testSMSNotification(phoneNumber) {
  try {
    const result = await notifications.testSMS(phoneNumber);
    return { success: true, result };
  } catch (err) {
    logger.error({ err, phoneNumber }, 'alerts:test_sms_error');
    return { success: false, error: String(err) };
  }
}
