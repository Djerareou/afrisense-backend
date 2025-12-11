// src/modules/positions/positions.service.js
import { positionSchema, bulkPositionsSchema } from './positions.schema.js';
import * as model from './positions.model.js';
import { toISO, haversineDistance } from './positions.utils.js';
import { PositionsMessages } from './positions.messages.js';
import { prisma } from '../../config/prismaClient.js';
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
    const tracker = await prisma.tracker.findUnique({ where: { imei: parsed.trackerImei } });

    if (!tracker) throw new Error(PositionsMessages.TRACKER_NOT_FOUND);
    if (userContext.userId && userContext.role !== 'admin' && tracker.userId !== userContext.userId) {
      throw new Error(PositionsMessages.ACCESS_DENIED);
    }

    trackerId = tracker.id;
  }

  if (!trackerId) throw new Error(PositionsMessages.TRACKER_NOT_FOUND);

  // idempotence
  if (parsed.externalId) {
    const existing = await prisma.position.findFirst({ where: { externalId: parsed.externalId } });
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
      const existing = await prisma.position.findFirst({ where: { externalId: parsed.externalId } });
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
    let tracker = await prisma.tracker.findUnique({ where: { id: trackerId } });
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
 * ingest bulk positions (with optional post-processing)
 * @param {boolean} runGeofenceDetection - If true, runs geofence detection for each position (slower but complete)
 */
export async function ingestPositionsBulk(items, userContext = {}, runGeofenceDetection = false) {
  const parsed = bulkPositionsSchema.parse(items);

  // Prefetch trackers by IMEI
  const imeis = [...new Set(parsed.filter(p => p.trackerImei).map(p => p.trackerImei))];

  const trackers = imeis.length
    ? await prisma.tracker.findMany({
        where: { imei: { in: imeis } },
        select: { id: true, imei: true, userId: true },
      })
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
    ? await prisma.position.findMany({
        where: { externalId: { in: externalIds } },
        select: { externalId: true },
      })
    : [];

  const existingSet = new Set(existingExternal.map(e => e.externalId));

  const toInsert = [];
  const errors = [];

  // Re-check trackers by ID
  const trackerIds = [...new Set(itemsResolved.map(i => i.resolvedTrackerId).filter(Boolean))];

  if (trackerIds.length) {
    const trackersById = await prisma.tracker.findMany({
      where: { id: { in: trackerIds } },
      select: { id: true, userId: true },
    });
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

  let totalInserted = 0;
  
  // If geofence detection is required, insert positions individually or in small batches
  // Note: Processing individually ensures proper geofence detection and alert creation
  // for each position. For large batches (>100 positions), consider splitting the request.
  if (runGeofenceDetection) {
    const GEOFENCE_BATCH_SIZE = parseInt(process.env.GEOFENCE_DETECTION_BATCH_SIZE || '1', 10);
    
    // Process in small batches if configured, otherwise one-by-one
    for (let i = 0; i < toInsert.length; i++) {
      const item = toInsert[i];
      try {
        const position = await model.createPosition(item.normalized);
        totalInserted++;

        // Run geofence detection for this position
        try {
          await detectAndPersistGeofenceTransitions(position);
        } catch (err) {
          logger.error({ err, positionId: position.id }, 'Geofence detection failed');
        }
      } catch (err) {
        // Handle duplicate errors gracefully
        if (err?.code === 'P2002') {
          errors.push({ index: item.index, error: PositionsMessages.POSITION_DUPLICATE });
        } else {
          logger.error({ err, index: item.index }, 'Position insertion failed');
          errors.push({ index: item.index, error: err.message });
        }
      }
    }
  } else {
    // Fast path: bulk insert without geofence detection
    const CHUNK_SIZE = parseInt(process.env.POSITIONS_BULK_CHUNK_SIZE || '5000', 10);
    const createData = toInsert.map(t => t.normalized);
    
    for (let i = 0; i < createData.length; i += CHUNK_SIZE) {
      const chunk = createData.slice(i, i + CHUNK_SIZE);
      const res = await model.createPositionsBulk(chunk);

      if (Array.isArray(res)) {
        totalInserted += res.length;
      } else if (typeof res?.count === 'number') {
        totalInserted += res.count;
      }
    }
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
