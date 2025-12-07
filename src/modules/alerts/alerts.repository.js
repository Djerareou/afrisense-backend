import { prisma } from '../../config/prismaClient.js';

/**
 * Create a new alert in the database
 * @param {Object} payload - Alert data (trackerId, type, positionId, geofenceId, meta)
 * @returns {Promise<Object>} Created alert
 */
export async function createAlert(payload) {
  return prisma.alert.create({ 
    data: payload,
    include: {
      tracker: true,
      geofence: true
    }
  });
}

/**
 * Find alerts with filtering and pagination
 * @param {Object} filter - Filter criteria
 * @param {Object} options - Pagination options (skip, take)
 * @returns {Promise<Array>} List of alerts
 */
export async function findAlerts(filter = {}, options = {}) {
  const where = {};
  
  if (filter.type) where.type = filter.type;
  if (filter.trackerId) where.trackerId = filter.trackerId;
  if (filter.geofenceId) where.geofenceId = filter.geofenceId;
  
  if (filter.dateFrom || filter.dateTo) {
    where.timestamp = {};
    if (filter.dateFrom) where.timestamp.gte = new Date(filter.dateFrom);
    if (filter.dateTo) where.timestamp.lte = new Date(filter.dateTo);
  }

  const { skip = 0, take = 50 } = options;
  return prisma.alert.findMany({ 
    where, 
    skip, 
    take, 
    orderBy: { timestamp: 'desc' },
    include: {
      tracker: true,
      geofence: true
    }
  });
}

/**
 * Find a single alert by ID
 * @param {string} id - Alert ID
 * @returns {Promise<Object|null>} Alert or null
 */
export async function findAlertById(id) {
  return prisma.alert.findUnique({ 
    where: { id },
    include: {
      tracker: true,
      geofence: true
    }
  });
}

/**
 * Delete an alert
 * @param {string} id - Alert ID
 * @returns {Promise<Object>} Deleted alert
 */
export async function deleteAlert(id) {
  return prisma.alert.delete({ where: { id } });
}

/**
 * Find recent similar alerts (for duplicate prevention)
 * @param {Object} criteria - Alert criteria (trackerId, type, geofenceId)
 * @param {Date} since - Time threshold
 * @returns {Promise<Array>} Recent similar alerts
 */
export async function findRecentSimilarAlerts(criteria, since) {
  const where = {
    trackerId: criteria.trackerId,
    type: criteria.type,
    timestamp: { gte: since }
  };
  
  // Include geofenceId in matching criteria, even if null, to properly detect duplicates
  if (criteria.geofenceId !== undefined) {
    where.geofenceId = criteria.geofenceId;
  }
  
  return prisma.alert.findMany({ where, orderBy: { timestamp: 'desc' }, take: 1 });
}

/**
 * Get alert settings for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Alert settings or null
 */
export async function getAlertSettings(userId) {
  return prisma.alertSetting.findUnique({ where: { userId } });
}

/**
 * Update or create alert settings for a user
 * @param {string} userId - User ID
 * @param {Object} data - Settings data
 * @returns {Promise<Object>} Updated/created settings
 */
export async function updateAlertSettings(userId, data) {
  const existing = await prisma.alertSetting.findUnique({ where: { userId } });
  if (existing) {
    return prisma.alertSetting.update({ where: { userId }, data });
  }
  return prisma.alertSetting.create({ data: { userId, ...data } });
}

/**
 * Create a delivery log entry
 * @param {Object} logData - Delivery log data
 * @returns {Promise<Object>} Created log
 */
export async function createDeliveryLog({ alertId, channel, status, providerRef = null, error = null }) {
  return prisma.alertDeliveryLog.create({ 
    data: { alertId, channel, status, providerRef, error } 
  });
}
