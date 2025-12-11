// src/modules/trackers/trackers.service.js (ESM)
import {
  createTracker,
  getTrackerById,
  getTrackerByIMEI,
  listTrackers,
  updateTracker,
  deleteTracker,
} from './trackers.model.js';

import { normalizeProtocol, sanitizeIMEI, defaultStatus, mapBatteryToStatus } from './trackers.utils.js';
import * as repository from './trackers.repository.js';
import logger from '../../utils/logger.js';
import { TrackerMessages } from './messages.js';

/**
 * Register a new tracker. Validates existence and attaches defaults.
 * @param {Object} data - Tracker creation payload
 */
export async function registerTracker(data) {
  const imei = sanitizeIMEI(data.imei);

  const exists = await getTrackerByIMEI(imei);
  if (exists) throw new Error(TrackerMessages.TRACKER_ALREADY_REGISTERED);

  const payload = {
    imei,
    protocol: normalizeProtocol(data.protocol),
    label: data.label || `Tracker ${imei}`,
    model: data.model || 'generic',
    // vehicle association is handled via TrackerAssignment table
    // do not write vehicleId directly unless the schema has that column
    userId: data.userId,
    status: defaultStatus(),
  };

  const tracker = await createTracker(payload);
  // audit log entry in TrackerConfigLog for creation — swallow errors during unit tests
  try {
    await repository.createConfigLog({
      trackerId: tracker.id,
      command: 'CREATE_TRACKER',
      status: 'success',
      response: JSON.stringify({ createdBy: data.userId }),
    });
  } catch (e) {
    logger.warn({ action: 'audit_create_failed', error: e?.message });
  }

  logger.info({ action: 'registerTracker', trackerId: tracker.id, userId: data.userId });
  return tracker;
}

export async function getAllTrackers(user) {
  // if caller is an owner, only return trackers belonging to that user
  if (user && user.role === 'owner') {
    return listTrackers({ userId: user.userId });
  }
  return listTrackers();
}

export async function getTracker(id) {
  const t = await getTrackerById(id);
  if (!t) throw new Error(TrackerMessages.TRACKER_NOT_FOUND);
  return t;
}

export async function modifyTracker(id, updateData) {
  await getTracker(id); // verify existence

  // auto-map battery -> status if provided
  if (typeof updateData.batteryLevel === 'number') {
    updateData.status = mapBatteryToStatus(updateData.batteryLevel);
  }

  const updated = await updateTracker(id, updateData);
  try {
    await repository.createConfigLog({
      trackerId: id,
      command: 'UPDATE_TRACKER',
      status: 'success',
      response: JSON.stringify(updateData),
    });
  } catch (e) {
    logger.warn({ action: 'audit_update_failed', error: e?.message });
  }

  logger.info({ action: 'modifyTracker', trackerId: id });
  return updated;
}

export async function removeTracker(id) {
  await getTracker(id); // verify existence
  const removed = await deleteTracker(id);
  try {
    await repository.createConfigLog({
      trackerId: id,
      command: 'DELETE_TRACKER',
      status: 'success',
      response: null,
    });
  } catch (e) {
    logger.warn({ action: 'audit_delete_failed', error: e?.message });
  }
  logger.info({ action: 'removeTracker', trackerId: id });
  return removed;
}

