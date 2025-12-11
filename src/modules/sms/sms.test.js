/**
 * SMS Module Tests
 * Tests for SMS parsing, webhook handling, and integration with positions/geofences/alerts
 */

// Mock dependencies BEFORE imports
jest.mock('../../config/prismaClient.js', () => ({
  prisma: {
    tracker: {},
    position: {},
  },
}));
jest.mock('../geofences/geofences.events.js');
jest.mock('../alerts/alerts.service.js');
jest.mock('../../utils/logger.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { parseShortSms } from './sms.utils.js';
import { handleSmsPayload } from './sms.service.js';
import { prisma } from '../../config/prismaClient.js';
import { detectAndPersistGeofenceTransitions } from '../geofences/geofences.events.js';
import { createAlert } from '../alerts/alerts.service.js';

describe('SMS Utils - parseShortSms', () => {
  test('parses valid SMS format correctly', () => {
    const sms = 'AF|T:123456789012345|TS:2025-12-11T10:30:00.000Z|LAT:6.5|LON:3.3|B:85|E:MOVE|ID:ext123';
    const result = parseShortSms(sms);

    expect(result).toEqual({
      trackerImei: '123456789012345',
      ts: '2025-12-11T10:30:00.000Z',
      lat: 6.5,
      lon: 3.3,
      bat: 85,
      evt: 'MOVE',
      extId: 'ext123',
    });
  });

  test('parses SMS without optional fields', () => {
    const sms = 'AF|T:123456789012345|TS:2025-12-11T10:30:00.000Z|LAT:6.5|LON:3.3';
    const result = parseShortSms(sms);

    expect(result.trackerImei).toBe('123456789012345');
    expect(result.lat).toBe(6.5);
    expect(result.lon).toBe(3.3);
    expect(result.bat).toBeNull();
    expect(result.evt).toBeNull();
    expect(result.extId).toBeNull();
  });

  test('throws error for missing AF prefix', () => {
    const sms = 'T:123456789012345|TS:2025-12-11T10:30:00.000Z|LAT:6.5|LON:3.3';
    expect(() => parseShortSms(sms)).toThrow('SMS_INVALID_FORMAT: missing AF prefix');
  });

  test('throws error for missing tracker IMEI', () => {
    const sms = 'AF|TS:2025-12-11T10:30:00.000Z|LAT:6.5|LON:3.3';
    expect(() => parseShortSms(sms)).toThrow('SMS_INVALID_FORMAT: missing tracker IMEI');
  });

  test('throws error for missing timestamp', () => {
    const sms = 'AF|T:123456789012345|LAT:6.5|LON:3.3';
    expect(() => parseShortSms(sms)).toThrow('SMS_INVALID_FORMAT: missing timestamp');
  });

  test('throws error for missing latitude', () => {
    const sms = 'AF|T:123456789012345|TS:2025-12-11T10:30:00.000Z|LON:3.3';
    expect(() => parseShortSms(sms)).toThrow('SMS_INVALID_FORMAT: missing or invalid latitude');
  });

  test('throws error for invalid timestamp format', () => {
    const sms = 'AF|T:123456789012345|TS:invalid-date|LAT:6.5|LON:3.3';
    expect(() => parseShortSms(sms)).toThrow('SMS_INVALID_FORMAT: invalid timestamp format');
  });

  test('handles empty or null input', () => {
    expect(() => parseShortSms('')).toThrow('SMS_INVALID_FORMAT: text is empty');
    expect(() => parseShortSms(null)).toThrow('SMS_INVALID_FORMAT: text is empty');
  });

  test('throws error for latitude out of range', () => {
    const sms = 'AF|T:123456789012345|TS:2025-12-11T10:30:00.000Z|LAT:999|LON:3.3';
    expect(() => parseShortSms(sms)).toThrow('SMS_INVALID_FORMAT: latitude out of range');
  });

  test('throws error for longitude out of range', () => {
    const sms = 'AF|T:123456789012345|TS:2025-12-11T10:30:00.000Z|LAT:6.5|LON:999';
    expect(() => parseShortSms(sms)).toThrow('SMS_INVALID_FORMAT: longitude out of range');
  });
});

describe('SMS Service - handleSmsPayload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates position from valid SMS webhook', async () => {
    const mockTracker = {
      id: 'tracker123',
      imei: '123456789012345',
      userId: 'user123',
      user: { id: 'user123', email: 'test@example.com' },
    };

    const mockPosition = {
      id: 'pos123',
      trackerId: 'tracker123',
      latitude: 6.5,
      longitude: 3.3,
      source: 'sms',
    };

    prisma.tracker = {
      findUnique: jest.fn().mockResolvedValue(mockTracker),
    };

    prisma.position = {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(mockPosition),
    };

    detectAndPersistGeofenceTransitions.mockResolvedValue([]);
    createAlert.mockResolvedValue(null);

    const payload = {
      Body: 'AF|T:123456789012345|TS:2025-12-11T10:30:00.000Z|LAT:6.5|LON:3.3|B:85|E:MOVE|ID:ext123',
      From: '+1234567890',
    };

    const result = await handleSmsPayload(payload);

    expect(result.positionId).toBe('pos123');
    expect(result.duplicate).toBe(false);
    expect(prisma.position.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        trackerId: 'tracker123',
        latitude: 6.5,
        longitude: 3.3,
        source: 'sms',
        batteryLevel: 85,
        eventType: 'MOVE',
        externalId: 'ext123',
      }),
    });
    expect(detectAndPersistGeofenceTransitions).toHaveBeenCalledWith(mockPosition);
  });

  test('handles duplicate position via externalId (idempotence)', async () => {
    const mockTracker = {
      id: 'tracker123',
      imei: '123456789012345',
      userId: 'user123',
      user: { id: 'user123' },
    };

    const existingPosition = {
      id: 'existing-pos',
      externalId: 'ext123',
    };

    prisma.tracker = {
      findUnique: jest.fn().mockResolvedValue(mockTracker),
    };

    prisma.position = {
      findUnique: jest.fn().mockResolvedValue(existingPosition),
      create: jest.fn(),
    };

    const payload = {
      Body: 'AF|T:123456789012345|TS:2025-12-11T10:30:00.000Z|LAT:6.5|LON:3.3|ID:ext123',
    };

    const result = await handleSmsPayload(payload);

    expect(result.positionId).toBe('existing-pos');
    expect(result.duplicate).toBe(true);
    expect(prisma.position.create).not.toHaveBeenCalled();
    expect(detectAndPersistGeofenceTransitions).not.toHaveBeenCalled();
  });

  test('creates SOS alert when event type is SOS', async () => {
    const mockTracker = {
      id: 'tracker123',
      imei: '123456789012345',
      userId: 'user123',
      user: { id: 'user123' },
    };

    const mockPosition = {
      id: 'pos123',
      trackerId: 'tracker123',
    };

    const mockAlert = {
      id: 'alert123',
      type: 'SOS',
    };

    prisma.tracker = {
      findUnique: jest.fn().mockResolvedValue(mockTracker),
    };

    prisma.position = {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(mockPosition),
    };

    detectAndPersistGeofenceTransitions.mockResolvedValue([]);
    createAlert.mockResolvedValue(mockAlert);

    const payload = {
      Body: 'AF|T:123456789012345|TS:2025-12-11T10:30:00.000Z|LAT:6.5|LON:3.3|E:SOS',
      From: '+1234567890',
    };

    const result = await handleSmsPayload(payload);

    expect(createAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user123',
        trackerId: 'tracker123',
        positionId: 'pos123',
        type: 'SOS',
        severity: 'CRITICAL',
      })
    );
    expect(result.alerts).toContainEqual(mockAlert);
  });

  test('creates low battery alert when battery < 20%', async () => {
    const mockTracker = {
      id: 'tracker123',
      imei: '123456789012345',
      userId: 'user123',
      user: { id: 'user123' },
    };

    const mockPosition = {
      id: 'pos123',
      trackerId: 'tracker123',
    };

    const mockAlert = {
      id: 'alert456',
      type: 'BATTERY_LOW',
    };

    prisma.tracker = {
      findUnique: jest.fn().mockResolvedValue(mockTracker),
    };

    prisma.position = {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(mockPosition),
    };

    detectAndPersistGeofenceTransitions.mockResolvedValue([]);
    createAlert.mockResolvedValue(mockAlert);

    const payload = {
      Body: 'AF|T:123456789012345|TS:2025-12-11T10:30:00.000Z|LAT:6.5|LON:3.3|B:15',
    };

    const result = await handleSmsPayload(payload);

    expect(createAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user123',
        trackerId: 'tracker123',
        positionId: 'pos123',
        type: 'BATTERY_LOW',
        severity: 'CRITICAL',
        metadata: expect.objectContaining({
          batteryLevel: 15,
        }),
      })
    );
    expect(result.alerts).toContainEqual(mockAlert);
  });

  test('throws error when tracker not found', async () => {
    prisma.tracker = {
      findUnique: jest.fn().mockResolvedValue(null),
    };

    const payload = {
      Body: 'AF|T:999999999999999|TS:2025-12-11T10:30:00.000Z|LAT:6.5|LON:3.3',
    };

    await expect(handleSmsPayload(payload)).rejects.toThrow('SMS_TRACKER_NOT_FOUND');
  });

  test('supports multiple SMS provider formats', async () => {
    const mockTracker = {
      id: 'tracker123',
      imei: '123456789012345',
      userId: 'user123',
      user: { id: 'user123' },
    };

    const mockPosition = { id: 'pos123' };

    prisma.tracker = {
      findUnique: jest.fn().mockResolvedValue(mockTracker),
    };

    prisma.position = {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(mockPosition),
    };

    detectAndPersistGeofenceTransitions.mockResolvedValue([]);

    // Test Twilio format
    const twilioPayload = {
      Body: 'AF|T:123456789012345|TS:2025-12-11T10:30:00.000Z|LAT:6.5|LON:3.3',
      From: '+1234567890',
    };
    await handleSmsPayload(twilioPayload);
    expect(prisma.position.create).toHaveBeenCalled();

    jest.clearAllMocks();

    // Test generic format
    const genericPayload = {
      message: 'AF|T:123456789012345|TS:2025-12-11T10:30:00.000Z|LAT:6.5|LON:3.3',
      sender: '+1234567890',
    };

    prisma.position.create.mockResolvedValue(mockPosition);
    await handleSmsPayload(genericPayload);
    expect(prisma.position.create).toHaveBeenCalled();
  });
});
