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
  return prisma.trackerConfigLog.create({
    data: {
      trackerId: logData.trackerId,
      command: logData.command,
      status: logData.status,
      response: logData.response,
    },
  });
}
