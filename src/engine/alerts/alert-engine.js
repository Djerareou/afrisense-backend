import { prisma } from '../../config/prismaClient.js';
import RULES from './rules.index.js';
import * as alertsService from '../../modules/alerts/alerts.service.js';
import NotificationService from '../../services/notification.service.js';

// simple loader to fetch tracker and user preferences
async function loadContextForTracker(trackerId) {
  const tracker = await prisma.tracker.findUnique({ where: { id: trackerId } });
  if (!tracker) return null;
  const userId = tracker.userId;
  const preferences = await prisma.alertSetting.findUnique({ where: { userId } }).catch(() => null);
  return { tracker, preferences, userId };
}

export async function runRulesForPosition(position) {
  if (!position || !position.trackerId) return;
  const ctx = await loadContextForTracker(position.trackerId);
  if (!ctx) return;

  for (const rule of RULES) {
    // skip scheduled-only rules (those exposing scheduledCheck)
    if (rule.scheduledCheck) continue;
    try {
      const res = await rule.check({ tracker: ctx.tracker, position, preferences: ctx.preferences });
      if (res?.triggered) {
        const alert = await alertsService.createAlert({
          trackerId: ctx.tracker.id,
          userId: ctx.userId,
          type: rule.id.toUpperCase(),
          title: `${rule.id} triggered`,
          message: JSON.stringify(res.meta || {}),
          severity: 'WARNING',
          metadata: res.meta || {}
        });
        // notify according to preferences
        const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
        await NotificationService.notifyAll(alert, user);
      }
    } catch (err) {
      console.error('Rule error', rule.id, err);
    }
  }
}

export async function runRulesForGeofenceEvent(event) {
  if (!event || !event.trackerId) return;
  const ctx = await loadContextForTracker(event.trackerId);
  if (!ctx) return;

  for (const rule of RULES) {
    if (rule.scheduledCheck) continue;
    try {
      // pass event as well
      const res = await rule.check({ tracker: ctx.tracker, position: null, preferences: ctx.preferences, event });
      if (res?.triggered) {
        const alert = await alertsService.createAlert({
          trackerId: ctx.tracker.id,
          userId: ctx.userId,
          type: rule.id.toUpperCase(),
          title: `${rule.id} triggered`,
          message: JSON.stringify(res.meta || {}),
          severity: 'INFO',
          metadata: { ...res.meta, geofenceEvent: event }
        });
        const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
        await NotificationService.notifyAll(alert, user);
      }
    } catch (err) {
      console.error('Rule error', rule.id, err);
    }
  }
}

// Runs scheduled rules that expose scheduledCheck
export async function runScheduledRules() {
  for (const rule of RULES) {
    if (!rule.scheduledCheck) continue;
    try {
      if (rule.id === 'offline') {
        const threshold = parseInt(process.env.ALERT_OFFLINE_MINUTES || '10', 10);
        const items = await rule.scheduledCheck({ thresholdMinutes: threshold });
        for (const it of items) {
          const tracker = it.tracker;
          const ctx = await loadContextForTracker(tracker.id);
          if (!ctx) continue;
          const alert = await alertsService.createAlert({
            trackerId: tracker.id,
            userId: ctx.userId,
            type: 'OFFLINE',
            title: 'Device offline',
            message: `No communication since ${threshold} minutes`,
            severity: 'WARNING',
            metadata: { lastCommunication: tracker.lastCommunication }
          });
          const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
          await NotificationService.notifyAll(alert, user);
        }
      }

      if (rule.id === 'no-movement') {
        const threshold = parseInt(process.env.ALERT_NO_MOVEMENT_MINUTES || '15', 10);
        const items = await rule.scheduledCheck({ thresholdMinutes: threshold });
        for (const it of items) {
          const tracker = it.tracker;
          const ctx = await loadContextForTracker(tracker.id);
          if (!ctx) continue;
          const alert = await alertsService.createAlert({
            trackerId: tracker.id,
            userId: ctx.userId,
            type: 'NO_MOVEMENT',
            title: 'No movement detected',
            message: `No movement or recent positions in last ${threshold} minutes`,
            severity: 'INFO',
            metadata: {}
          });
          const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
          await NotificationService.notifyAll(alert, user);
        }
      }

    } catch (err) {
      console.error('Scheduled rule failed', rule.id, err);
    }
  }
}

export default {
  runRulesForPosition,
  runRulesForGeofenceEvent,
  runScheduledRules,
};
