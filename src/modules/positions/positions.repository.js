// src/modules/positions/positions.repository.js
/**
 * Repository layer for positions module
 * Handles all database operations via Prisma
 */

import { prisma } from '../../config/prismaClient.js';

/**
 * Find tracker by ID
 * @param {string} trackerId - Tracker ID
 * @returns {Promise<Object|null>}
 */
export async function findTrackerById(trackerId) {
  return prisma.tracker.findUnique({
    where: { id: trackerId },
  });
}

/**
 * Find tracker by IMEI
 * @param {string} imei - Tracker IMEI
 * @returns {Promise<Object|null>}
 */
export async function findTrackerByImei(imei) {
  return prisma.tracker.findUnique({
    where: { imei },
  });
}

/**
 * Find position by external ID
 * @param {string} externalId - External position ID
 * @returns {Promise<Object|null>}
 */
export async function findPositionByExternalId(externalId) {
  return prisma.position.findFirst({
    where: { externalId },
  });
}

/**
 * Find multiple trackers by IMEIs
 * @param {string[]} imeis - Array of tracker IMEIs
 * @returns {Promise<Array>}
 */
export async function findTrackersByImeis(imeis) {
  return prisma.tracker.findMany({
    where: { imei: { in: imeis } },
    select: { id: true, imei: true, userId: true },
  });
}

/**
 * Find positions by external IDs
 * @param {string[]} externalIds - Array of external IDs
 * @returns {Promise<Array>}
 */
export async function findPositionsByExternalIds(externalIds) {
  return prisma.position.findMany({
    where: { externalId: { in: externalIds } },
    select: { externalId: true },
  });
}

/**
 * Find trackers by IDs
 * @param {string[]} trackerIds - Array of tracker IDs
 * @returns {Promise<Array>}
 */
export async function findTrackersByIds(trackerIds) {
  return prisma.tracker.findMany({
    where: { id: { in: trackerIds } },
    select: { id: true, userId: true },
  });
}
