// src/modules/trackers/trackers.utils.js
// small helpers for tracker handling

export function sanitizeIMEI(imei) {
  if (!imei) return '';
  return String(imei).replace(/[^0-9]/g, '');
}

export function normalizeProtocol(protocol) {
  if (!protocol) return 'GT06';
  return String(protocol).trim().toUpperCase();
}

export function defaultStatus() {
  return 'inactive';
}

/**
 * Map a battery level to a suggested status string.
 * @param {number} batteryLevel 0..100
 */
export function mapBatteryToStatus(batteryLevel) {
  if (batteryLevel == null) return undefined;
  if (batteryLevel <= 5) return 'lost';
  if (batteryLevel <= 20) return 'maintenance';
  return 'active';
}

