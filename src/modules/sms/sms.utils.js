/**
 * SMS Parsing Utility
 * Parses short SMS format: AF|T:<IMEI>|TS:<ISO_TIMESTAMP>|LAT:<lat>|LON:<lon>|B:<battery>|E:<event>|ID:<externalId>
 */

/**
 * Parse short SMS format into normalized object
 * @param {string} text - SMS body text
 * @returns {object} Parsed SMS data { trackerImei, ts, lat, lon, bat, evt, extId }
 * @throws {Error} If SMS format is invalid
 */
export function parseShortSms(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('SMS_INVALID_FORMAT: text is empty or not a string');
  }

  const trimmed = text.trim();
  
  // Check if it starts with AF prefix
  if (!trimmed.startsWith('AF|')) {
    throw new Error('SMS_INVALID_FORMAT: missing AF prefix');
  }

  // Split by pipe delimiter
  const parts = trimmed.split('|');
  
  const result = {
    trackerImei: null,
    ts: null,
    lat: null,
    lon: null,
    bat: null,
    evt: null,
    extId: null,
  };

  // Parse each part
  for (const part of parts) {
    if (!part || part === 'AF') continue;

    const colonIndex = part.indexOf(':');
    if (colonIndex === -1) continue;

    const key = part.substring(0, colonIndex).trim();
    const value = part.substring(colonIndex + 1).trim();

    switch (key) {
      case 'T':
        result.trackerImei = value;
        break;
      case 'TS':
        result.ts = value;
        break;
      case 'LAT':
        result.lat = parseFloat(value);
        break;
      case 'LON':
        result.lon = parseFloat(value);
        break;
      case 'B':
        result.bat = parseFloat(value);
        break;
      case 'E':
        result.evt = value;
        break;
      case 'ID':
        result.extId = value;
        break;
      default:
        // Ignore unknown fields
        break;
    }
  }

  // Validate required fields
  if (!result.trackerImei) {
    throw new Error('SMS_INVALID_FORMAT: missing tracker IMEI (T field)');
  }
  if (!result.ts) {
    throw new Error('SMS_INVALID_FORMAT: missing timestamp (TS field)');
  }
  if (result.lat === null || isNaN(result.lat)) {
    throw new Error('SMS_INVALID_FORMAT: missing or invalid latitude (LAT field)');
  }
  if (result.lon === null || isNaN(result.lon)) {
    throw new Error('SMS_INVALID_FORMAT: missing or invalid longitude (LON field)');
  }
  
  // Validate coordinate ranges
  if (result.lat < -90 || result.lat > 90) {
    throw new Error('SMS_INVALID_FORMAT: latitude out of range (-90 to 90)');
  }
  if (result.lon < -180 || result.lon > 180) {
    throw new Error('SMS_INVALID_FORMAT: longitude out of range (-180 to 180)');
  }

  // Validate timestamp format (ISO 8601)
  const tsDate = new Date(result.ts);
  if (isNaN(tsDate.getTime())) {
    throw new Error('SMS_INVALID_FORMAT: invalid timestamp format');
  }

  return result;
}
