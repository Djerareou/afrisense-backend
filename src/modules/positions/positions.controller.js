// src/modules/positions/positions.controller.js
import * as service from './positions.service.js';
import { PositionsMessages } from './positions.messages.js';

export async function createManual(req, res) {
  try {
    const userContext = { userId: req.user?.userId, role: req.user?.role };
    const inserted = await service.ingestPosition(req.body, userContext);
    return res.status(201).json({ success: true, message: PositionsMessages.CREATED, data: inserted });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}

/**
 * Endpoint for Traccar webhook
 * Accepts Traccar payload or generic wrapped position
 */
export async function ingestTraccarWebhook(req, res) {
  try {
    const userContext = { userId: req.user?.userId, role: req.user?.role };
    // Traccar sends various shapes; try to normalize if necessary
    const raw = req.body;

    // If Traccar push contains 'position' object, try to extract
    let positionPayload = raw.position ?? raw;
    // Map Traccar keys to our schema if needed
    // Example mapping (adapt if your Traccar payload differs):
    if (positionPayload.deviceId && positionPayload.latitude != null) {
      positionPayload = {
        trackerId: undefined, // we resolve by IMEI if provided
        trackerImei: raw.device ? raw.device.imei || undefined : (raw.imei || raw.deviceId?.toString()),
        latitude: positionPayload.latitude,
        longitude: positionPayload.longitude,
        speed: positionPayload.speed ?? positionPayload.course ?? undefined,
        direction: positionPayload.course ?? undefined,
        timestamp: positionPayload.timestamp ?? positionPayload.serverTime ?? positionPayload.fixTime ?? new Date().toISOString(),
        eventType: raw.type ?? undefined,
        batteryLevel: positionPayload.battery ?? (positionPayload.attributes?.battery ?? undefined),
        externalId: positionPayload.id ? String(positionPayload.id) : undefined,
        source: 'tracker',
      };
    }

    const inserted = await service.ingestPosition(positionPayload, userContext);
    return res.status(201).json({ success: true, message: PositionsMessages.CREATED, data: inserted });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}

export async function getPositions(req, res) {
  try {
    const { trackerId, from, to, limit = 100, offset = 0 } = req.query;
    const filter = {};
    if (trackerId) filter.trackerId = trackerId;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.gte = new Date(from);
      if (to) filter.timestamp.lte = new Date(to);
    }
    const positions = await service.queryPositions(filter, { skip: +offset, take: +limit });
    return res.json({ success: true, data: positions });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getOnePosition(req, res) {
  try {
    const p = await service.getPositionById(req.params.id);
    if (!p) return res.status(404).json({ success: false, error: 'Not found' });
    return res.json({ success: true, data: p });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Batch sync endpoint for offline tracker buffer recovery
 * Accepts array of positions with idempotence via externalId
 */
export async function syncPositions(req, res) {
  try {
    const userContext = { userId: req.user?.userId, role: req.user?.role };
    const { positions } = req.body;

    if (!Array.isArray(positions)) {
      return res.status(400).json({ 
        success: false, 
        error: 'positions must be an array' 
      });
    }

    if (positions.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'positions array is empty' 
      });
    }

    // Normalize positions to include source if not provided
    const normalizedPositions = positions.map(p => ({
      ...p,
      source: p.source || 'recovery',
    }));

    // Enable geofence detection for sync endpoint (true parameter)
    const result = await service.ingestPositionsBulk(normalizedPositions, userContext, true);

    return res.status(200).json({
      success: true,
      data: {
        insertedCount: result.inserted || 0,
        skippedCount: result.errors?.length || 0,
        errors: result.errors || [],
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
