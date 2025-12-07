import prisma from "../../config/prismaClient.js";
import AppError from "../../utils/appError.js";

// -----------------------------------------------------
// CREATE
// -----------------------------------------------------

// --- Nouveau helper pour créer un événement Geofence ---
export const createGeofence = async ({ trackerId, geofenceId, type, positionId, meta }) => {
  if (!positionId) throw new AppError("positionId is required", 400);

  // vérifier que la position existe
  const position = await prisma.position.findUnique({ where: { id: positionId } });
  if (!position) throw new AppError("Position not found", 404);

  return prisma.geofenceEvent.create({
    data: { trackerId, geofenceId, type, positionId, meta },
  });
};


// -----------------------------------------------------
// GET ALL (per user)
// -----------------------------------------------------
export const getAllGeofences = async (userId) => {
  return await prisma.geofence.findMany({
    where: { userId },
    include: {
      trackers: true,
    },
  });
};

// -----------------------------------------------------
// GET ONE
// -----------------------------------------------------
export const getGeofenceById = async (id, userId) => {
  const geofence = await prisma.geofence.findFirst({
    where: { id, userId },
    include: {
      trackers: true,
      geofenceEvents: true,
    },
  });

  if (!geofence) throw new AppError("Geofence not found", 404);
  return geofence;
};

// -----------------------------------------------------
// UPDATE
// -----------------------------------------------------
export const updateGeofence = async (id, data, userId) => {
  // Ensure exists & belongs to user
  const exists = await prisma.geofence.findFirst({
    where: { id, userId },
  });

  if (!exists) throw new AppError("Geofence not found", 404);

  return await prisma.geofence.update({
    where: { id },
    data: {
      ...data,
      coordinates: data.coordinates ? JSON.stringify(data.coordinates) : undefined,
      center: data.center ? JSON.stringify(data.center) : undefined,
    },
  });
};

// -----------------------------------------------------
// DELETE
// -----------------------------------------------------
export const deleteGeofence = async (id, userId) => {
  const exists = await prisma.geofence.findFirst({
    where: { id, userId },
  });

  if (!exists) throw new AppError("Geofence not found", 404);

  await prisma.geofence.delete({ where: { id } });
};

// -----------------------------------------------------
// ASSIGN TRACKER
// -----------------------------------------------------
export const assignTracker = async (geofenceId, trackerId, userId) => {
  // Verify geofence belongs to user
  const geofence = await prisma.geofence.findFirst({
    where: { id: geofenceId, userId },
  });
  if (!geofence) throw new AppError("Geofence not found", 404);

  // Verify tracker belongs to user
  const tracker = await prisma.tracker.findFirst({
    where: { id: trackerId, userId },
  });
  if (!tracker) throw new AppError("Tracker not found", 404);

  return prisma.geofence.update({
    where: { id: geofenceId },
    data: {
      trackers: {
        connect: { id: trackerId },
      },
    },
  });
};

// -----------------------------------------------------
// UNASSIGN TRACKER
// -----------------------------------------------------
export const unassignTracker = async (geofenceId, trackerId, userId) => {
  const geofence = await prisma.geofence.findFirst({
    where: { id: geofenceId, userId },
  });
  if (!geofence) throw new AppError("Geofence not found", 404);

  return prisma.geofence.update({
    where: { id: geofenceId },
    data: {
      trackers: {
        disconnect: { id: trackerId },
      },
    },
  });
};

// -----------------------------------------------------
// GET EVENTS FOR A GEOFENCE
// -----------------------------------------------------
export const getGeofenceEvents = async (geofenceId, userId) => {
  // ensure user owns the geofence
  const geofence = await prisma.geofence.findFirst({
    where: { id: geofenceId, userId },
  });
  if (!geofence) throw new AppError("Geofence not found", 404);

  return await prisma.geofenceEvent.findMany({
    where: { geofenceId },
    include: { position: true, tracker: true },
    orderBy: { timestamp: "desc" },
  });
};