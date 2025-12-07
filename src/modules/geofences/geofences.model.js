// src/modules/geofences/geofence.model.js
import { prisma } from '../../config/prismaClient.js';

/**
 * Note: The Prisma schema should define Geofence and the many-to-many relation with Tracker.
 * Example snippet in schema.prisma:
 *
 * model Geofence {
 *   id          String   @id @default(uuid())
 *   name        String
 *   description String?
 *   type        String
 *   radius      Float?
 *   coordinates Json?
 *   center      Json?
 *   color       String?
 *   active      Boolean  @default(true)
 *   createdAt   DateTime @default(now())
 *   updatedAt   DateTime @updatedAt
 *
 *   trackers    Tracker[] @relation("TrackerGeofences")
 * }
 *
 * model Tracker {
 *   // ...
 *   geofences Geofence[] @relation("TrackerGeofences")
 * }
 */

export async function createGeofence(data) {
  const { trackerIds, ...rest } = data;
  const geofence = await prisma.geofence.create({
    data: {
      ...rest,
      coordinates: rest.coordinates ? JSON.stringify(rest.coordinates) : null,
      center: rest.center ? JSON.stringify(rest.center) : null,
      // trackers relation
      trackers: trackerIds && trackerIds.length
        ? { connect: trackerIds.map(id => ({ id })) }
        : undefined,
    },
    include: { trackers: true },
  });
  return geofence;
}

export async function findGeofenceById(id) {
  return prisma.geofence.findUnique({ where: { id }, include: { trackers: true } });
}

export async function listGeofences(filter = {}, options = {}) {
  const { skip = 0, take = 50 } = options;
  const where = {};

  if (filter.type) where.type = filter.type;
  if (typeof filter.active === 'boolean') where.active = filter.active;
  if (filter.trackerId) {
    // trackers is relation; use some
    where.trackers = { some: { id: filter.trackerId } };
  }

  const items = await prisma.geofence.findMany({
    where,
    skip,
    take,
    include: { trackers: true },
    orderBy: { createdAt: 'desc' },
  });
  return items;
}

export async function updateGeofence(id, data) {
  const { trackerIds, ...rest } = data;
  const updateData = {
    ...rest,
    coordinates: rest.coordinates ? JSON.stringify(rest.coordinates) : undefined,
    center: rest.center ? JSON.stringify(rest.center) : undefined,
  };

  return prisma.geofence.update({
    where: { id },
    data: updateData,
    include: { trackers: true },
  });
}

export async function softDeleteGeofence(id) {
  return prisma.geofence.update({
    where: { id },
    data: { active: false },
  });
}

export async function assignTrackerToGeofence(geofenceId, trackerId) {
  return prisma.geofence.update({
    where: { id: geofenceId },
    data: {
      trackers: { connect: { id: trackerId } },
    },
    include: { trackers: true },
  });
}

export async function unassignTrackerFromGeofence(geofenceId, trackerId) {
  return prisma.geofence.update({
    where: { id: geofenceId },
    data: {
      trackers: { disconnect: { id: trackerId } },
    },
    include: { trackers: true },
  });
}
