// src/modules/positions/positions.service.js
import { positionSchema, bulkPositionsSchema } from './positions.schema.js';
import * as model from './positions.model.js';
import * as repository from './positions.repository.js';
import { toISO, haversineDistance } from './positions.utils.js';
import { PositionsMessages } from './positions.messages.js';
import { detectAndPersistGeofenceTransitions } from '../geofences/geofences.events.js';
import logger from '../../utils/logger.js';



/**
 * normalize a validated position object (zod parsed)
 */
function normalizeParsed(parsed, trackerIdResolved, sourceDefault = 'tracker') {
  return {
    trackerId: trackerIdResolved,
    latitude: parsed.latitude,
    longitude: parsed.longitude,
    speed: parsed.speed ?? null,
    direction: parsed.direction ?? null,
    altitude: parsed.altitude ?? null,
    eventType: parsed.eventType ?? null,
    batteryLevel: parsed.batteryLevel ?? null,
    externalId: parsed.externalId ?? null,
    odometer: parsed.odometer ?? null,
    accuracy: parsed.accuracy ?? null,
    source: parsed.source ?? sourceDefault,
    timestamp: toISO(parsed.timestamp),
    createdAt: new Date().toISOString(),
  };
}


/**
 * ingest single position
 */
export async function ingestPosition(payload, userContext = {}) {
  const parsed = positionSchema.parse(payload);

  // resolve trackerId
  let trackerId = parsed.trackerId;
  if (!trackerId && parsed.trackerImei) {
    const tracker = await repository.findTrackerByImei(parsed.trackerImei);

    if (!tracker) throw new Error(PositionsMessages.TRACKER_NOT_FOUND);
    if (userContext.userId && userContext.role !== 'admin' && tracker.userId !== userContext.userId) {
      throw new Error(PositionsMessages.ACCESS_DENIED);
    }

    trackerId = tracker.id;
  }

  if (!trackerId) throw new Error(PositionsMessages.TRACKER_NOT_FOUND);

  // idempotence
  if (parsed.externalId) {
    const existing = await repository.findPositionByExternalId(parsed.externalId);
    if (existing) throw new Error(PositionsMessages.POSITION_DUPLICATE);
  } else {
    const existing = await model.findPositionByTrackerAndTimestamp(trackerId, parsed.timestamp);
    if (existing) throw new Error(PositionsMessages.POSITION_DUPLICATE);
  }

  // normalize
  const normalized = normalizeParsed(parsed, trackerId);

  // distanceFromLast
  const last = await model.findLatestPositionByTracker(trackerId);
  if (last) {
    try {
      normalized.distanceFromLast = haversineDistance(
        last.latitude,
        last.longitude,
        normalized.latitude,
        normalized.longitude
      );
    } catch (e) {}
  }

  // INSERT DB
  let inserted;
  try {
    inserted = await model.createPosition(normalized);
  } catch (err) {
    if (err?.code === 'P2002' && parsed.externalId) {
      const existing = await repository.findPositionByExternalId(parsed.externalId);
      if (existing) return existing;
    }
    throw err;
  }

  // 🚀 GEOFENCE TRANSITIONS : placé au BON endroit
  try {
    await detectAndPersistGeofenceTransitions(inserted);
  } catch (err) {
    logger.error({ err }, 'Geofence detection error');
  }

  // Alerts: overspeed / low battery
  try {
    const alerts = await import('../alerts/alerts.service.js');
    // get tracker owner
    let tracker = await repository.findTrackerById(trackerId);
    if (normalized.speed != null) {
      const settings = await alerts.getAlertSettings(tracker.userId);
      const thresholds = settings?.thresholds ? JSON.parse(settings.thresholds) : {};
      const overspeed = thresholds?.overspeed;
      const enabled = settings?.enabled !== false;
      if (enabled && overspeed && normalized.speed > overspeed) {
        alerts.createAlert({
          userId: tracker.userId,
          trackerId,
          positionId: inserted.id,
          type: 'OVERSPEED',
          severity: 'WARNING',
          metadata: { speed: normalized.speed },
        }).catch(() => {});
      }
    }

    if (normalized.batteryLevel != null) {
      const settings = await alerts.getAlertSettings(tracker.userId);
      const thresholds = settings?.thresholds ? JSON.parse(settings.thresholds) : {};
      const lowBattery = thresholds?.lowBattery;
      const enabled = settings?.enabled !== false;
      if (enabled && lowBattery != null && normalized.batteryLevel < lowBattery) {
        alerts.createAlert({
          userId: tracker.userId,
          trackerId,
          positionId: inserted.id,
          type: 'BATTERY_LOW',
          severity: 'CRITICAL',
          metadata: { batteryLevel: normalized.batteryLevel },
        }).catch(() => {});
      }
    }
  } catch (e) {
    // do not break position ingestion on alert errors
    logger.warn({ e }, 'alerts:processing_failed');
  }

  // Run global rule engine (best-effort, non-blocking)
  try {
    const engine = await import('../../engine/alerts/alert-engine.js');
    engine.default.runRulesForPosition(inserted).catch(() => {});
  } catch (e) {
    logger.warn({ e }, 'alertEngine:invoke_failed');
  }

  return inserted;
}



/**
 * ingest bulk positions
 */
export async function ingestPositionsBulk(items, userContext = {}) {
  const parsed = bulkPositionsSchema.parse(items);

  // Prefetch trackers by IMEI
  const imeis = [...new Set(parsed.filter(p => p.trackerImei).map(p => p.trackerImei))];

  const trackers = imeis.length
    ? await repository.findTrackersByImeis(imeis)
    : [];

  const imeiMap = Object.fromEntries(trackers.map(t => [t.imei, t.id]));
  const ownerMap = Object.fromEntries(trackers.map(t => [t.id, t.userId]));

  // Resolve trackerIds
  const itemsResolved = parsed.map((p, index) => {
    return {
      original: p,
      resolvedTrackerId: p.trackerId || (p.trackerImei ? imeiMap[p.trackerImei] : undefined),
      index,
    };
  });

  // Check existing externalIds
  const externalIds = [...new Set(itemsResolved.filter(i => i.original.externalId).map(i => i.original.externalId))];

  const existingExternal = externalIds.length
    ? await repository.findPositionsByExternalIds(externalIds)
    : [];

  const existingSet = new Set(existingExternal.map(e => e.externalId));

  const toInsert = [];
  const errors = [];

  // Re-check trackers by ID
  const trackerIds = [...new Set(itemsResolved.map(i => i.resolvedTrackerId).filter(Boolean))];

  if (trackerIds.length) {
    const trackersById = await repository.findTrackersByIds(trackerIds);
    for (const t of trackersById) ownerMap[t.id] = t.userId;
  }

  // Validate each item
  for (const item of itemsResolved) {
    const p = item.original;
    const trackerId = item.resolvedTrackerId;

    if (!trackerId) {
      errors.push({ index: item.index, error: PositionsMessages.TRACKER_NOT_FOUND });
      continue;
    }

    if (userContext.userId && userContext.role !== 'admin') {
      const ownerId = ownerMap[trackerId];
      if (!ownerId || ownerId !== userContext.userId) {
        errors.push({ index: item.index, error: PositionsMessages.ACCESS_DENIED });
        continue;
      }
    }

    if (p.externalId && existingSet.has(p.externalId)) {
      errors.push({ index: item.index, error: PositionsMessages.POSITION_DUPLICATE });
      continue;
    }

    const normalized = normalizeParsed(p, trackerId, 'gateway');
    toInsert.push({ normalized, index: item.index });
  }

  if (toInsert.length === 0) return { inserted: 0, errors };

  // Chunked insert
  const CHUNK_SIZE = parseInt(process.env.POSITIONS_BULK_CHUNK_SIZE || '5000', 10);
  const createData = toInsert.map(t => t.normalized);

  let totalInserted = 0;
  for (let i = 0; i < createData.length; i += CHUNK_SIZE) {
    const chunk = createData.slice(i, i + CHUNK_SIZE);
    const res = await model.createPositionsBulk(chunk);

    if (Array.isArray(res)) totalInserted += res.length;
    else if (typeof res?.count === 'number') totalInserted += res.count;
  }

  return { inserted: totalInserted, errors };
}


// Query helpers
export async function queryPositions(filter = {}, options = {}) {
  if (filter.timestamp) {
    if (filter.timestamp.gte) filter.timestamp.gte = new Date(filter.timestamp.gte);
    if (filter.timestamp.lte) filter.timestamp.lte = new Date(filter.timestamp.lte);
  }
  return model.findPositions(filter, options);
}

export async function getPositionById(id) {
  return model.findPositionById(id);
}
