import * as repo from './geofences.repository.js';
import { pointInCircle, pointInPolygon } from './geofences.utils.js';

/**
 * position: { id, trackerId, latitude, longitude, speed?, timestamp }
 * Retourne la liste des GeofenceEvent créés.
 */
export async function detectAndPersistGeofenceTransitions(position) {
  const trackerId = position.trackerId;
  const lat = position.latitude;
  const lon = position.longitude;
  const ts = position.timestamp instanceof Date ? position.timestamp : new Date(position.timestamp);

  // 1) récupérer geofences assignées au tracker
  const geofences = await repo.findGeofencesForTracker(trackerId);

  const createdEvents = [];

  for (const g of geofences) {
    // parse geometry
    const type = g.type;
    const coords = g.coordinates ? JSON.parse(g.coordinates) : null;
    const center = g.center ? JSON.parse(g.center) : null;
    let nowInside = false;

    if (type === 'circle' && center && g.radius) {
      // center stored as [lat, lon] or {lat,lng} depending on your implementation; handle both:
      let cLat, cLon;
      if (Array.isArray(center)) { [cLat, cLon] = center; }
      else { cLat = center.lat ?? center[0]; cLon = center.lng ?? center[1] ?? center[1]; }
      nowInside = pointInCircle(lat, lon, cLat, cLon, g.radius);
    } else if (type === 'polygon' && coords) {
      // coords must be [[lat, lon], ...]
      nowInside = pointInPolygon(lat, lon, coords);
    } else {
      // unsupported type -> skip
      continue;
    }

    // 2) retrouver dernier événement pour ce tracker+geofence
    const lastEvent = await repo.lastGeofenceEventForTrackerAndFence(trackerId, g.id);
    const wasInside = lastEvent ? lastEvent.type === 'enter' : false;

    // 3) déterminer transition
    let eventType = null;
    if (!wasInside && nowInside) eventType = 'enter';
    else if (wasInside && !nowInside) eventType = 'exit';

  if (eventType) {
      // 4) prévention doublons : si dernier event a même type, skip
      if (lastEvent && lastEvent.type === eventType) {
        // duplicate consecutive event -> skip
        continue;
      }

      // 5) persister événement
      const ev = {
        trackerId,
        geofenceId: g.id,
        type: eventType,
        timestamp: ts,
        positionId: position.id ?? null,
        meta: {
          position: { latitude: lat, longitude: lon, speed: position.speed ?? null },
          geofenceName: g.name,
        },
      };
      const created = await repo.createGeofenceEvent(ev);
      createdEvents.push(created);

      // fire alert asynchronously (do not block main flow)
      try {
        const alerts = await import('../alerts/alerts.service.js');
        // map enter/exit to alert types
        const type = eventType === 'enter' ? 'GEOFENCE_ENTER' : 'GEOFENCE_EXIT';
        // best-effort: don't await final delivery
        alerts.createAlert({
          userId: g.userId,
          trackerId,
          geofenceId: g.id,
          positionId: position.id ?? null,
          type,
          severity: 'INFO',
          metadata: ev.meta,
        }).catch(err => {
          // log and ignore
          // eslint-disable-next-line no-console
          console.error('createAlert failed:', err);
        });
      } catch (e) {
        // ignore dynamic import errors
      }
      // Also invoke centralized alert engine (best-effort)
      try {
        const engine = await import('../../engine/alerts/alert-engine.js');
        engine.default.runRulesForGeofenceEvent(created).catch(() => {});
      } catch (e) {
        // ignore
      }
    }
  }

  return createdEvents;
}
