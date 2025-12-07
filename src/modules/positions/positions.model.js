// src/modules/positions/positions.model.js
import { prisma } from '../../config/prismaClient.js';

/**
 * Note: If you enable PostGIS and add a 'location' Unsupported("geometry") field in Prisma,
 * you can use prisma.$executeRaw to insert location via ST_GeomFromText(..).
 */

export async function createPosition(data) {
  return prisma.position.create({ data });
}

export async function createPositionsBulk(items) {
  // Use createMany for performance. skipDuplicates avoids inserting rows that conflict with a unique constraint (externalId).
  // Returns an object { count: number } with number of records inserted.
  return prisma.position.createMany({ data: items, skipDuplicates: true });
}

export async function findPositionByTrackerAndTimestamp(trackerId, timestamp) {
  return prisma.position.findFirst({
    where: { trackerId, timestamp: new Date(timestamp) },
  });
}

export async function findPositions(filter = {}, options = {}) {
  const { skip = 0, take = 100, order = { timestamp: 'desc' } } = options;
  return prisma.position.findMany({
    where: filter,
    skip,
    take,
    orderBy: order,
  });
}

export async function findPositionById(id) {
  return prisma.position.findUnique({ where: { id } });
}

export async function findLatestPositionByTracker(trackerId) {
  return prisma.position.findFirst({
    where: { trackerId },
    orderBy: { timestamp: 'desc' },
  });
}

export async function deletePositionsOlderThan(date) {
  return prisma.position.deleteMany({ where: { timestamp: { lt: date } } });
}
