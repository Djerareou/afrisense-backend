// src/modules/trackers/trackers.model.js (ESM)
import { prisma } from '../../config/prismaClient.js';

// CREATE
export async function createTracker(data) {
  return prisma.tracker.create({ data });
}

// GET BY ID
export async function getTrackerById(id) {
  return prisma.tracker.findUnique({ where: { id } });
}

// GET BY IMEI
export async function getTrackerByIMEI(imei) {
  return prisma.tracker.findUnique({ where: { imei } });
}

// LIST WITH OPTIONAL FILTERS
export async function listTrackers(filters = {}) {
  return prisma.tracker.findMany({ where: filters });
}

// UPDATE
export async function updateTracker(id, data) {
  return prisma.tracker.update({
    where: { id },
    data,
  });
}

// DELETE
export async function deleteTracker(id) {
  // delete dependent records first to avoid foreign key constraint errors
  await prisma.trackerConfigLog.deleteMany({ where: { trackerId: id } }).catch(() => {});
  await prisma.position.deleteMany({ where: { trackerId: id } }).catch(() => {});
  await prisma.alert.deleteMany({ where: { trackerId: id } }).catch(() => {});
  await prisma.trackerAssignment.deleteMany({ where: { trackerId: id } }).catch(() => {});

  return prisma.tracker.delete({
    where: { id },
  });
}

