// src/modules/trackers/trackers.repository.js
/**
 * Repository layer for trackers module
 * Handles database operations for audit logging
 */

import { prisma } from '../../config/prismaClient.js';

/**
 * Create a tracker configuration log entry
 * @param {Object} logData - Log data
 * @param {string} logData.trackerId - Tracker ID
 * @param {string} logData.command - Command executed
 * @param {string} logData.status - Status (success/failure)
 * @param {string|null} logData.response - Response data as JSON string
 * @returns {Promise<Object>}
 */
export async function createConfigLog(logData) {
  const data = {
    trackerId: logData.trackerId,
    configKey: logData.configKey,
    newValue: logData.newValue,
    changedBy: logData.changedBy
  };

  if (Object.prototype.hasOwnProperty.call(logData, 'oldValue')) {
    data.oldValue = logData.oldValue;
  }

  return prisma.trackerConfigLog.create({ data });
}
