import * as repo from './alerts.repository.js';
import { AlertType, NotificationChannel } from './alerts.enums.js';
import logger from '../../utils/logger.js';
import * as notifications from './notifications.js';

// Minimal notification sender (stub). Replace with real providers later.
async function sendNotification(channel, alert, settings) {
  try {
    if (channel === 'EMAIL') {
      const to = settings?.email || process.env.DEFAULT_ALERT_EMAIL;
      if (!to) throw new Error('No recipient for email');
      const res = await notifications.send('EMAIL', to, `Alert: ${alert.type}`, JSON.stringify(alert.metadata || {}));
      return { status: 'success', providerRef: JSON.stringify(res) };
    }
    // console fallback
    const res = await notifications.send('CONSOLE', null, `Alert: ${alert.type}`, JSON.stringify(alert.metadata || {}));
    return { status: 'success', providerRef: JSON.stringify(res) };
  } catch (err) {
    return { status: 'failure', error: String(err) };
  }
}

export async function createAlert(payload) {
  // Validation
  const { userId, trackerId, type, severity, positionId, metadata = {} } = payload;
  if (!positionId) throw new Error('positionId is required');

  // Verify tracker ownership
  const tracker = await import('../../config/prismaClient.js').then(m => m.prisma).then(p => p.tracker.findUnique({ where: { id: trackerId } }));
  if (!tracker) throw new Error('Tracker not found');
  if (tracker.userId !== userId) throw new Error('ACCESS_DENIED');

  // Verify type enabled in user settings
  const settings = await repo.getAlertSettings(userId);
  if (settings) {
    // check types enabled - we store channels and thresholds; for simplicity assume enabled boolean
    if (settings.enabled === false) {
      logger.info({ userId, type }, 'alerts:disabled_for_user');
      return null;
    }
  }

  // Persist alert
  const stored = await repo.createAlert({ userId, trackerId, type, severity, geofenceId: payload.geofenceId ?? null, positionId, metadata });

  // Notify according to settings
  const channels = (settings && settings.channels) ? JSON.parse(settings.channels) : null;
  const preferred = channels || ['CONSOLE'];

  for (const ch of preferred) {
    const channel = ch.toUpperCase();
    const result = await sendNotification(channel, stored, settings);
    const status = result.status === 'success' ? 'success' : 'failure';
    await repo.createDeliveryLog({ alertId: stored.id, channel, status, providerRef: result.providerRef ?? null, error: result.error ?? null });
  }

  return stored;
}

export async function getAlerts(filter = {}, options = {}) {
  return repo.findAlerts(filter, options);
}

export async function updateAlertStatus(id, userId, status) {
  // verify ownership
  const existing = await import('../../config/prismaClient.js').then(m => m.prisma).then(p => p.alert.findUnique({ where: { id } }));
  if (!existing) throw new Error('Alert not found');
  if (existing.userId !== userId) throw new Error('ACCESS_DENIED');
  return repo.updateAlertStatus(id, status);
}

export async function getAlertSettings(userId) {
  return repo.getAlertSettings(userId);
}

export async function updateAlertSettings(userId, data) {
  // Expect channels and thresholds to be JSON-able
  const payload = { ...data };
  if (payload.channels && typeof payload.channels !== 'string') payload.channels = JSON.stringify(payload.channels);
  return repo.updateAlertSettings(userId, payload);
}

export async function logAlertDelivery(alertId, channel, status, providerResponse) {
  return repo.createDeliveryLog({ alertId, channel, status, providerRef: providerResponse?.id ?? null, error: providerResponse?.error ?? null });
}
