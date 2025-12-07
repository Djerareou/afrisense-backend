// src/modules/trackers/trackers.controller.js (ESM)
import {
  registerTracker,
  getAllTrackers,
  getTracker,
  modifyTracker,
  removeTracker,
} from './trackers.service.js';

import { createTrackerSchema, updateTrackerSchema } from './trackers.schema.js';
import logger from '../../utils/logger.js';
import { TrackerMessages } from './messages.js';

/**
 * Create a tracker
 */
export async function create(req, res) {
  try {
    const data = createTrackerSchema.parse(req.body);
    const payload = { ...data, userId: req.user?.userId };
    const tracker = await registerTracker(payload);
    logger.info({ user: req.user?.userId, action: 'TRACKER_CREATE', trackerId: tracker.id });
    res.status(201).json(tracker);
  } catch (err) {
    logger.error({ action: 'TRACKER_CREATE_FAIL', error: err?.message });
    return res.status(400).json({ error: TrackerMessages.INVALID_PAYLOAD + (err?.message ? ': ' + err.message : '') });
  }
}

/**
 * List trackers
 */
export async function list(req, res) {
  const trackers = await getAllTrackers(req.user);
  return res.json(trackers);
}

/**
 * Get one tracker by id
 */
export async function getOne(req, res) {
  try {
    const tracker = await getTracker(req.params.id);
    // enforce ownership: owners can only access their own trackers
    if (req.user?.role === 'owner' && tracker.userId !== req.user.userId) {
      logger.warn({ action: 'TRACKER_GET_FORBIDDEN', id: req.params.id, user: req.user?.userId });
      return res.status(403).json({ error: TrackerMessages.FORBIDDEN });
    }
    return res.json(tracker);
  } catch (err) {
    logger.warn({ action: 'TRACKER_GET_FAIL', id: req.params.id, error: err?.message });
    return res.status(404).json({ error: TrackerMessages.TRACKER_NOT_FOUND });
  }
}

/**
 * Update a tracker
 */
export async function update(req, res) {
  try {
    // check existence and ownership first
    const existing = await getTracker(req.params.id);
    if (req.user?.role === 'owner' && existing.userId !== req.user.userId) {
      logger.warn({ action: 'TRACKER_UPDATE_FORBIDDEN', id: req.params.id, user: req.user?.userId });
      return res.status(403).json({ error: TrackerMessages.FORBIDDEN });
    }
    const data = updateTrackerSchema.parse(req.body);
    const tracker = await modifyTracker(req.params.id, data);
    logger.info({ user: req.user?.userId, action: 'TRACKER_UPDATE', trackerId: tracker.id });
    return res.json(tracker);
  } catch (err) {
    logger.error({ action: 'TRACKER_UPDATE_FAIL', id: req.params.id, error: err?.message });
    return res.status(400).json({ error: TrackerMessages.INVALID_PAYLOAD + (err?.message ? ': ' + err.message : '') });
  }
}

/**
 * Remove a tracker
 */
export async function remove(req, res) {
  try {
    const existing = await getTracker(req.params.id);
    if (req.user?.role === 'owner' && existing.userId !== req.user.userId) {
      logger.warn({ action: 'TRACKER_DELETE_FORBIDDEN', id: req.params.id, user: req.user?.userId });
      return res.status(403).json({ error: TrackerMessages.FORBIDDEN });
    }
    await removeTracker(req.params.id);
    logger.info({ user: req.user?.userId, action: 'TRACKER_DELETE', trackerId: req.params.id });
    return res.json({ message: 'Tracker deleted' });
  } catch (err) {
    logger.error({ action: 'TRACKER_DELETE_FAIL', id: req.params.id, error: err?.message });
    return res.status(404).json({ error: TrackerMessages.TRACKER_NOT_FOUND });
  }
}

