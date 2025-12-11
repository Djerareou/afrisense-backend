/**
 * SMS Service
 * Handles SMS payload processing, position creation, geofence detection, and alert generation
 */

import { parseShortSms } from './sms.utils.js';
import { prisma } from '../../config/prismaClient.js';
import { detectAndPersistGeofenceTransitions } from '../geofences/geofences.events.js';
import { createAlert } from '../alerts/alerts.service.js';
import logger from '../../utils/logger.js';

/**
 * Extract SMS body from various provider formats
 * @param {object} raw - Raw webhook payload
 * @returns {string|null} SMS body text or null if not found
 */
function extractSmsBody(raw) {
  // Support multiple provider formats
  return raw.Body || raw.body || raw.message || raw.text || raw.Message || null;
}

/**
 * Extract sender/from field from various provider formats
 * @param {object} raw - Raw webhook payload
 * @returns {string} Sender phone number or identifier
 */
function extractSmsSender(raw) {
  return raw.From || raw.from || raw.sender || raw.Sender || raw.msisdn || '';
}

/**
 * Main SMS payload handler pipeline
 * @param {object} raw - Raw webhook payload from SMS provider
 * @returns {Promise<object>} Result with positionId and events
 */
export async function handleSmsPayload(raw) {
  try {
    // Step 1: Extract SMS body
    const smsBody = extractSmsBody(raw);
    const smsSender = extractSmsSender(raw);

    logger.info({ sender: smsSender, bodyLength: smsBody?.length }, 'Processing SMS webhook');

    if (!smsBody) {
      throw new Error('SMS_EMPTY_BODY: No SMS body found in payload');
    }

    // Step 2: Parse SMS using parseShortSms
    const parsed = parseShortSms(smsBody);
    logger.info({ parsed }, 'SMS parsed successfully');

    // Step 3: Resolve tracker via IMEI
    const tracker = await prisma.tracker.findUnique({
      where: { imei: parsed.trackerImei },
      include: { user: true },
    });

    if (!tracker) {
      throw new Error(`SMS_TRACKER_NOT_FOUND: No tracker found with IMEI ${parsed.trackerImei}`);
    }

    // Step 4: Create Position with all fields
    const positionData = {
      trackerId: tracker.id,
      latitude: parsed.lat,
      longitude: parsed.lon,
      timestamp: new Date(parsed.ts),
      eventType: parsed.evt || null,
      externalId: parsed.extId || null,
      batteryLevel: parsed.bat !== null ? parsed.bat : null,
      source: 'sms',
    };

    // Check for duplicate by externalId
    // Note: There's a potential race condition here - two concurrent requests could both
    // pass this check. The database unique constraint on externalId will catch duplicates,
    // handled in the catch block below with P2002 error code.
    if (positionData.externalId) {
      const existing = await prisma.position.findUnique({
        where: { externalId: positionData.externalId },
      });
      if (existing) {
        logger.info({ externalId: positionData.externalId }, 'SMS position already exists (idempotent)');
        return { positionId: existing.id, events: [], duplicate: true };
      }
    }

    // Insert position
    let position;
    try {
      position = await prisma.position.create({ data: positionData });
      logger.info({ positionId: position.id }, 'Position created from SMS');
    } catch (err) {
      // Handle race condition: if another request created this position concurrently,
      // the unique constraint on externalId will fail with P2002
      if (err?.code === 'P2002' && positionData.externalId) {
        const existing = await prisma.position.findUnique({
          where: { externalId: positionData.externalId },
        });
        if (existing) {
          logger.info({ externalId: positionData.externalId }, 'SMS position already exists (race condition)');
          return { positionId: existing.id, events: [], duplicate: true };
        }
      }
      throw err;
    }

    // Step 5: Run geofence detection
    let geofenceEvents = [];
    try {
      geofenceEvents = await detectAndPersistGeofenceTransitions(position);
      logger.info({ count: geofenceEvents.length }, 'Geofence transitions detected');
    } catch (err) {
      logger.error({ err }, 'Geofence detection failed');
    }

    // Step 6: For each geofence event, alert is already created in geofences.events.js
    // Step 7: Check for SOS or low battery and create additional alerts
    const alerts = [];
    
    try {
      // SOS alert
      if (parsed.evt && parsed.evt.toUpperCase() === 'SOS') {
        const sosAlert = await createAlert({
          userId: tracker.userId,
          trackerId: tracker.id,
          positionId: position.id,
          type: 'SOS',
          severity: 'CRITICAL',
          metadata: {
            source: 'sms',
            eventType: parsed.evt,
            sender: smsSender,
          },
        });
        alerts.push(sosAlert);
        logger.info({ alertId: sosAlert?.id }, 'SOS alert created');
      }

      // Low battery alert (configurable threshold, default 20%)
      const lowBatteryThreshold = parseInt(process.env.LOW_BATTERY_THRESHOLD || '20', 10);
      if (parsed.bat !== null && parsed.bat < lowBatteryThreshold) {
        const batteryAlert = await createAlert({
          userId: tracker.userId,
          trackerId: tracker.id,
          positionId: position.id,
          type: 'BATTERY_LOW',
          severity: 'CRITICAL',
          metadata: {
            source: 'sms',
            batteryLevel: parsed.bat,
            sender: smsSender,
          },
        });
        alerts.push(batteryAlert);
        logger.info({ alertId: batteryAlert?.id }, 'Low battery alert created');
      }
    } catch (err) {
      logger.error({ err }, 'Alert creation failed');
    }

    // Step 8: Return result
    return {
      positionId: position.id,
      events: geofenceEvents,
      alerts: alerts.filter(Boolean),
      duplicate: false,
    };
  } catch (err) {
    logger.error({ err, raw }, 'SMS payload handling failed');
    throw err;
  }
}
