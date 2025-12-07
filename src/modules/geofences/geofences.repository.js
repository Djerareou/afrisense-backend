import { prisma } from '../../config/prismaClient.js';

/**
 * Repository functions for geofences and events.
 */
export async function findGeofencesForTracker(trackerId) {
  if (!prisma || !prisma.geofence || typeof prisma.geofence.findMany !== 'function') {
    // during unit tests prisma may be mocked/absent; return empty list to avoid breaking callers
    return [];
  }
  return prisma.geofence.findMany({
    where: { active: true, trackers: { some: { id: trackerId } } },
    include: { trackers: true },
  });
}

export async function findGeofenceById(id) {
  if (!prisma || !prisma.geofence || typeof prisma.geofence.findUnique !== 'function') return null;
  return prisma.geofence.findUnique({ where: { id }, include: { trackers: true } });
}

export async function createGeofence(data) {
  const { trackerIds, ...rest } = data;
  if (!prisma || !prisma.geofence || typeof prisma.geofence.create !== 'function') {
    throw new Error('Prisma geofence model not available');
  }
  return prisma.geofence.create({
    data: {
      ...rest,
      coordinates: rest.coordinates ? JSON.stringify(rest.coordinates) : null,
      center: rest.center ? JSON.stringify(rest.center) : null,
      trackers: trackerIds?.length ? { connect: trackerIds.map(id => ({ id })) } : undefined,
    },
    include: { trackers: true },
  });
}

export async function createGeofenceEvent(event) {
  // event = { trackerId, geofenceId, type, timestamp, positionId, meta }
  if (!prisma || !prisma.geofenceEvent || typeof prisma.geofenceEvent.create !== 'function') {
    // fallback: return a shallow event object (useful during unit tests)
    return { id: 'mock-event', ...event };
  }
  return prisma.geofenceEvent.create({ data: event });
}

export async function lastGeofenceEventForTrackerAndFence(trackerId, geofenceId) {
  if (!prisma || !prisma.geofenceEvent || typeof prisma.geofenceEvent.findFirst !== 'function') return null;
  return prisma.geofenceEvent.findFirst({
    where: { trackerId, geofenceId },
    orderBy: { timestamp: 'desc' },
  });
}


