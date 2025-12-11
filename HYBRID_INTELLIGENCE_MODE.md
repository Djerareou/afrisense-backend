# AfriSense Hybrid-Intelligence Mode

## Overview

The Hybrid-Intelligence Mode enables AfriSense to ingest position data from multiple sources:
- **SMS Fallback**: Receive positions via SMS when internet connectivity is unavailable
- **Offline Buffer Sync**: Bulk upload positions stored locally during offline periods
- **Real-time Tracker**: Continue to receive data from connected GPS trackers

All position sources are processed through the same geofence detection and alert system, ensuring consistent monitoring regardless of data source.

## Features

### 1. SMS Ingestion

Receive GPS position data via SMS when trackers have cellular coverage but no data connection.

#### SMS Payload Format

SMS messages must follow this pipe-delimited format:

```
AF|T:<IMEI>|TS:<ISO_TIMESTAMP>|LAT:<latitude>|LON:<longitude>|B:<battery>|E:<event>|ID:<externalId>
```

**Required Fields:**
- `AF` - Message prefix (required for validation)
- `T:<IMEI>` - Tracker IMEI (15 digits)
- `TS:<ISO_TIMESTAMP>` - ISO 8601 timestamp (e.g., `2025-12-11T10:30:00.000Z`)
- `LAT:<latitude>` - Latitude (-90 to 90)
- `LON:<longitude>` - Longitude (-180 to 180)

**Optional Fields:**
- `B:<battery>` - Battery level (0-100)
- `E:<event>` - Event type (e.g., `MOVE`, `STOP`, `SOS`)
- `ID:<externalId>` - Unique identifier for idempotence

**Example:**
```
AF|T:123456789012345|TS:2025-12-11T10:30:00.000Z|LAT:6.5244|LON:3.3792|B:85|E:MOVE|ID:sms-001
```

#### Webhook Endpoint

**URL:** `POST /webhooks/sms/receive`

**Authentication:** Public endpoint (no auth token required)

**Supported Providers:**
- Twilio
- Termii
- CallMeBot
- Africa's Talking
- Any SMS provider that sends HTTP webhooks

**Request Body Examples:**

Twilio format:
```json
{
  "Body": "AF|T:123456789012345|TS:2025-12-11T10:30:00.000Z|LAT:6.5244|LON:3.3792|B:85",
  "From": "+1234567890"
}
```

Generic format:
```json
{
  "message": "AF|T:123456789012345|TS:2025-12-11T10:30:00.000Z|LAT:6.5244|LON:3.3792",
  "sender": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "positionId": "uuid",
    "eventsCount": 1,
    "alertsCount": 0,
    "duplicate": false
  }
}
```

#### Special Features

**Automatic Alerts:**
- **SOS Alert**: Automatically created when event type is `SOS`
- **Low Battery Alert**: Automatically created when battery level < 20%

**Idempotence:**
Messages with the same `externalId` are processed only once, preventing duplicates.

**Geofence Integration:**
SMS positions trigger geofence detection and alerts just like real-time tracker data.

### 2. Batch Sync Endpoint

Upload multiple positions in a single request, ideal for syncing offline tracker buffers.

#### Endpoint

**URL:** `POST /api/positions/sync`

**Authentication:** Required (Bearer token or device HMAC)

**Request Body:**
```json
{
  "positions": [
    {
      "trackerImei": "123456789012345",
      "latitude": 6.5244,
      "longitude": 3.3792,
      "timestamp": "2025-12-11T10:00:00.000Z",
      "externalId": "offline-001",
      "batteryLevel": 75,
      "eventType": "MOVE",
      "source": "recovery"
    },
    {
      "trackerImei": "123456789012345",
      "latitude": 6.5255,
      "longitude": 3.3801,
      "timestamp": "2025-12-11T10:05:00.000Z",
      "externalId": "offline-002",
      "batteryLevel": 74
    }
  ]
}
```

**Field Descriptions:**
- `trackerImei` (required): Tracker IMEI identifier
- `latitude` (required): Latitude (-90 to 90)
- `longitude` (required): Longitude (-180 to 180)
- `timestamp` (required): ISO 8601 timestamp
- `externalId` (optional): Unique identifier for idempotence
- `batteryLevel` (optional): Battery level (0-100)
- `eventType` (optional): Event type string
- `source` (optional): Defaults to "recovery" if not provided

**Response:**
```json
{
  "success": true,
  "data": {
    "insertedCount": 2,
    "skippedCount": 0,
    "errors": []
  }
}
```

#### Features

**Idempotence:**
Positions with duplicate `externalId` values are automatically skipped.

**Geofence Detection:**
Each synced position triggers geofence detection and alert creation.

**Bulk Processing:**
Positions are inserted individually to ensure proper geofence and alert processing.

## Configuration

### SMS Provider Setup

#### Twilio
1. Create a Twilio account at https://www.twilio.com
2. Buy a phone number with SMS capabilities
3. Configure webhook URL: `https://your-domain.com/webhooks/sms/receive`
4. Set HTTP method to `POST`
5. Send test SMS to verify

#### Termii
1. Create account at https://termii.com
2. Configure webhook URL in dashboard
3. Set endpoint: `https://your-domain.com/webhooks/sms/receive`

#### CallMeBot
1. Register at https://www.callmebot.com
2. Set webhook URL for SMS delivery
3. Configure to POST to: `https://your-domain.com/webhooks/sms/receive`

### Environment Variables

```env
# SMS Configuration (Optional)
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Alert Configuration
LOW_BATTERY_THRESHOLD=20  # Battery percentage for low battery alerts (default: 20)

# Batch Sync Configuration
POSITIONS_BULK_CHUNK_SIZE=5000  # Number of positions per chunk (default: 5000)
GEOFENCE_DETECTION_BATCH_SIZE=1  # Batch size for geofence detection (default: 1)
```

### Webhook Security (Optional)

To add signature validation for SMS webhooks, update `src/modules/sms/sms.service.js`:

```javascript
// Add provider signature validation
function validateTwilioSignature(req) {
  const signature = req.headers['x-twilio-signature'];
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  // Implement Twilio signature validation
  // See: https://www.twilio.com/docs/usage/security#validating-requests
}
```

## Error Codes

### SMS Webhook Errors

| Status | Error Code | Description |
|--------|------------|-------------|
| 400 | `SMS_INVALID_FORMAT: missing AF prefix` | SMS doesn't start with AF prefix |
| 400 | `SMS_INVALID_FORMAT: missing tracker IMEI` | T field is missing |
| 400 | `SMS_INVALID_FORMAT: missing timestamp` | TS field is missing |
| 400 | `SMS_INVALID_FORMAT: missing or invalid latitude` | LAT field is missing or invalid |
| 400 | `SMS_INVALID_FORMAT: missing or invalid longitude` | LON field is missing or invalid |
| 400 | `SMS_INVALID_FORMAT: invalid timestamp format` | Timestamp is not valid ISO 8601 |
| 400 | `SMS_EMPTY_BODY` | SMS body is empty |
| 404 | `SMS_TRACKER_NOT_FOUND` | No tracker with specified IMEI |
| 500 | Internal server error | Database or processing error |

### Batch Sync Errors

| Status | Error Code | Description |
|--------|------------|-------------|
| 400 | `positions must be an array` | Request body format invalid |
| 400 | `positions array is empty` | No positions provided |
| 401 | Unauthorized | Missing or invalid auth token |
| 500 | Internal server error | Database or processing error |

## Testing

### SMS Webhook Test

```bash
curl -X POST http://localhost:3000/webhooks/sms/receive \
  -H "Content-Type: application/json" \
  -d '{
    "Body": "AF|T:123456789012345|TS:2025-12-11T10:30:00.000Z|LAT:6.5244|LON:3.3792|B:85|E:MOVE|ID:test-001",
    "From": "+1234567890"
  }'
```

### Batch Sync Test

```bash
curl -X POST http://localhost:3000/api/positions/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "positions": [
      {
        "trackerImei": "123456789012345",
        "latitude": 6.5244,
        "longitude": 3.3792,
        "timestamp": "2025-12-11T10:00:00.000Z",
        "externalId": "sync-001",
        "batteryLevel": 75
      }
    ]
  }'
```

## Device Integration

### SMS Module for Trackers

Example code for tracker devices to send SMS:

```c
// Format position as SMS
char sms[200];
snprintf(sms, sizeof(sms), 
  "AF|T:%s|TS:%s|LAT:%.6f|LON:%.6f|B:%d|E:%s|ID:%s",
  tracker_imei,
  iso_timestamp,
  latitude,
  longitude,
  battery_level,
  event_type,
  unique_id
);

// Send SMS to configured number
send_sms(AFRISENSE_SMS_NUMBER, sms);
```

### Offline Buffer Sync

Example code for tracker offline buffer:

```javascript
// Collect positions during offline period
const offlineBuffer = [];

function storePosition(position) {
  offlineBuffer.push({
    trackerImei: device.imei,
    latitude: position.lat,
    longitude: position.lon,
    timestamp: new Date().toISOString(),
    externalId: `offline-${Date.now()}`,
    batteryLevel: getBatteryLevel(),
    source: 'recovery'
  });
}

// When connection restored, sync all positions
async function syncOfflineBuffer() {
  const response = await fetch('https://api.afrisense.com/api/positions/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${deviceToken}`
    },
    body: JSON.stringify({ positions: offlineBuffer })
  });
  
  const result = await response.json();
  console.log(`Synced ${result.data.insertedCount} positions`);
  
  // Clear buffer after successful sync
  offlineBuffer.length = 0;
}
```

## Architecture

### Data Flow

```
SMS Provider → Webhook → SMS Service → Position Creation → Geofence Detection → Alert Creation
                                    ↓
                              Database (Position)
                                    ↓
                            GeofenceEvents + Alerts
```

### Source Types

- `tracker` - Real-time GPS tracker data
- `sms` - SMS fallback data
- `recovery` - Offline buffer sync
- `gateway` - Third-party gateway
- `manual` - Manual entry
- `import` - Bulk import

All sources are processed identically through geofence and alert systems.

## Performance Considerations

### SMS Processing
- Average processing time: 100-200ms per SMS
- Includes: parsing, validation, DB insert, geofence detection, alert creation
- Scales to handle high SMS volumes

### Batch Sync
- Processes positions individually for geofence detection
- Recommended batch size: 100-500 positions per request
- For larger batches, split into multiple requests

## Troubleshooting

### SMS Not Creating Position

1. Check SMS format matches specification
2. Verify tracker IMEI exists in database
3. Check webhook URL is publicly accessible
4. Review application logs for errors

### Duplicate Positions

1. Ensure unique `externalId` for each position
2. Check for race conditions in concurrent requests
3. Use idempotence properly

### Geofence Not Detecting

1. Verify tracker is assigned to geofence
2. Check geofence is active
3. Verify position coordinates are valid
4. Review geofence configuration (radius, coordinates)

## Support

For issues or questions:
- Email: support@afrisense.com
- Documentation: https://docs.afrisense.com
- GitHub Issues: https://github.com/Djerareou/afrisense-backend/issues
