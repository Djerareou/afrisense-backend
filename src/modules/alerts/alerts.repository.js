import { prisma } from '../../config/prismaClient.js';

export async function createAlert(payload) {
  // payload expected to have userId, trackerId, type, severity, positionId, metadata
  return prisma.alert.create({ data: payload });
}

export async function findAlerts(filter = {}, options = {}) {
  const where = {};
  if (filter.userId) where.userId = filter.userId;
  if (filter.type) where.type = filter.type;
  if (filter.severity) where.severity = filter.severity;
  if (filter.trackerId) where.trackerId = filter.trackerId;
  if (filter.geofenceId) where.geofenceId = filter.geofenceId;
  if (filter.dateFrom || filter.dateTo) {
    where.createdAt = {};
    if (filter.dateFrom) where.createdAt.gte = new Date(filter.dateFrom);
    if (filter.dateTo) where.createdAt.lte = new Date(filter.dateTo);
  }

  const { skip = 0, take = 50 } = options;
  return prisma.alert.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } });
}

export async function updateAlertStatus(id, status) {
  return prisma.alert.update({ where: { id }, data: { status } });
}

export async function getAlertSettings(userId) {
  return prisma.alertSetting.findUnique({ where: { userId } });
}

export async function updateAlertSettings(userId, data) {
  // upsert pattern: create or update
  const existing = await prisma.alertSetting.findUnique({ where: { userId } });
  if (existing) {
    return prisma.alertSetting.update({ where: { userId }, data });
  }
  return prisma.alertSetting.create({ data: { userId, ...data } });
}

export async function createDeliveryLog({ alertId, channel, status, providerRef = null, error = null }) {
  return prisma.alertDeliveryLog.create({ data: { alertId, channel, status, providerRef, error } });
}
