/**
 * SMS Integration Tests
 * Full workflow tests: SMS webhook → Position → GeofenceEvent → Alert
 */

// Mock dependencies BEFORE imports
jest.mock('../../config/prismaClient.js', () => ({
  prisma: {
    tracker: {},
    position: {},
  },
}));
jest.mock('../../modules/geofences/geofences.events.js');
jest.mock('../../modules/alerts/alerts.service.js');
jest.mock('../../utils/logger.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));
jest.mock('../../middleware/authMiddleware.js', () => ({
  authMiddleware: (req, res, next) => {
    req.user = { userId: 'user123', role: 'user' };
    next();
  },
}));

import request from 'supertest';
import app from '../../app.js';
import { prisma } from '../../config/prismaClient.js';
import { detectAndPersistGeofenceTransitions } from '../../modules/geofences/geofences.events.js';
import { createAlert } from '../../modules/alerts/alerts.service.js';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SMS Webhook Integration', () => {
  test('POST /webhooks/sms/receive creates position from valid SMS', async () => {
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
      batteryLevel: 85,
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

    const res = await request(app)
      .post('/webhooks/sms/receive')
      .send({
        Body: 'AF|T:123456789012345|TS:2025-12-11T10:30:00.000Z|LAT:6.5|LON:3.3|B:85|E:MOVE|ID:sms-001',
        From: '+1234567890',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.result.positionId).toBe('pos123');
    expect(prisma.position.create).toHaveBeenCalled();
    expect(detectAndPersistGeofenceTransitions).toHaveBeenCalledWith(mockPosition);
  });

  test('SMS webhook handles idempotence (duplicate externalId)', async () => {
    const mockTracker = {
      id: 'tracker123',
      imei: '123456789012345',
      userId: 'user123',
      user: { id: 'user123' },
    };

    const existingPosition = {
      id: 'existing-pos',
      externalId: 'sms-001',
    };

    prisma.tracker = {
      findUnique: jest.fn().mockResolvedValue(mockTracker),
    };

    prisma.position = {
      findUnique: jest.fn().mockResolvedValue(existingPosition),
      create: jest.fn(),
    };

    const res = await request(app)
      .post('/webhooks/sms/receive')
      .send({
        Body: 'AF|T:123456789012345|TS:2025-12-11T10:30:00.000Z|LAT:6.5|LON:3.3|ID:sms-001',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.result.duplicate).toBe(true);
    expect(prisma.position.create).not.toHaveBeenCalled();
    expect(detectAndPersistGeofenceTransitions).not.toHaveBeenCalled();
  });

  test('SMS webhook creates geofence events and alerts', async () => {
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

    const mockGeofenceEvents = [
      {
        id: 'event1',
        type: 'enter',
        geofenceId: 'geo1',
      },
    ];

    prisma.tracker = {
      findUnique: jest.fn().mockResolvedValue(mockTracker),
    };

    prisma.position = {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(mockPosition),
    };

    detectAndPersistGeofenceTransitions.mockResolvedValue(mockGeofenceEvents);
    createAlert.mockResolvedValue({ id: 'alert1' });

    const res = await request(app)
      .post('/webhooks/sms/receive')
      .send({
        Body: 'AF|T:123456789012345|TS:2025-12-11T10:30:00.000Z|LAT:6.5|LON:3.3|E:SOS|B:15',
      });

    expect(res.status).toBe(200);
    expect(res.body.result.eventsCount).toBe(1);
    expect(detectAndPersistGeofenceTransitions).toHaveBeenCalledWith(mockPosition);
    
    // Should create SOS alert and low battery alert
    expect(createAlert).toHaveBeenCalledTimes(2);
    expect(createAlert).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SOS' })
    );
    expect(createAlert).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'BATTERY_LOW' })
    );
  });

  test('SMS webhook returns 404 when tracker not found', async () => {
    prisma.tracker = {
      findUnique: jest.fn().mockResolvedValue(null),
    };

    const res = await request(app)
      .post('/webhooks/sms/receive')
      .send({
        Body: 'AF|T:999999999999999|TS:2025-12-11T10:30:00.000Z|LAT:6.5|LON:3.3',
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('SMS_TRACKER_NOT_FOUND');
  });

  test('SMS webhook returns 400 for invalid SMS format', async () => {
    const res = await request(app)
      .post('/webhooks/sms/receive')
      .send({
        Body: 'INVALID_FORMAT',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('SMS_INVALID_FORMAT');
  });
});

describe('Position Sync Integration', () => {
  test('POST /api/positions/sync handles batch positions with geofence detection', async () => {
    const mockTracker = {
      id: 'tracker123',
      imei: '123456789012345',
      userId: 'user123',
    };

    const mockPosition1 = { id: 'pos1', trackerId: 'tracker123' };
    const mockPosition2 = { id: 'pos2', trackerId: 'tracker123' };

    prisma.tracker = {
      findMany: jest.fn().mockResolvedValue([mockTracker]),
      findUnique: jest.fn().mockResolvedValue(mockTracker),
    };

    prisma.position = {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn()
        .mockResolvedValueOnce(mockPosition1)
        .mockResolvedValueOnce(mockPosition2),
    };

    detectAndPersistGeofenceTransitions.mockResolvedValue([]);

    const res = await request(app)
      .post('/api/positions/sync')
      .set('Authorization', 'Bearer dummy-token')
      .send({
        positions: [
          {
            trackerImei: '123456789012345',
            latitude: 6.5,
            longitude: 3.3,
            timestamp: '2025-12-11T10:00:00.000Z',
            externalId: 'sync-001',
            batteryLevel: 75,
          },
          {
            trackerImei: '123456789012345',
            latitude: 6.6,
            longitude: 3.4,
            timestamp: '2025-12-11T10:05:00.000Z',
            externalId: 'sync-002',
            batteryLevel: 74,
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.insertedCount).toBe(2);
    expect(res.body.data.skippedCount).toBe(0);
    expect(detectAndPersistGeofenceTransitions).toHaveBeenCalledTimes(2);
  });

  test('POST /api/positions/sync skips duplicate positions', async () => {
    const mockTracker = {
      id: 'tracker123',
      imei: '123456789012345',
      userId: 'user123',
    };

    prisma.tracker = {
      findMany: jest.fn().mockResolvedValue([mockTracker]),
      findUnique: jest.fn().mockResolvedValue(mockTracker),
    };

    prisma.position = {
      findMany: jest.fn().mockResolvedValue([{ externalId: 'sync-001' }]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'pos2' }),
    };

    detectAndPersistGeofenceTransitions.mockResolvedValue([]);

    const res = await request(app)
      .post('/api/positions/sync')
      .set('Authorization', 'Bearer dummy-token')
      .send({
        positions: [
          {
            trackerImei: '123456789012345',
            latitude: 6.5,
            longitude: 3.3,
            timestamp: '2025-12-11T10:00:00.000Z',
            externalId: 'sync-001', // duplicate
          },
          {
            trackerImei: '123456789012345',
            latitude: 6.6,
            longitude: 3.4,
            timestamp: '2025-12-11T10:05:00.000Z',
            externalId: 'sync-002',
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.insertedCount).toBe(1);
    expect(res.body.data.skippedCount).toBe(1);
  });

  test('POST /api/positions/sync returns 400 for invalid input', async () => {
    const res = await request(app)
      .post('/api/positions/sync')
      .set('Authorization', 'Bearer dummy-token')
      .send({
        positions: 'invalid',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('positions must be an array');
  });

  test('POST /api/positions/sync returns 400 for empty positions array', async () => {
    const res = await request(app)
      .post('/api/positions/sync')
      .set('Authorization', 'Bearer dummy-token')
      .send({
        positions: [],
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('positions array is empty');
  });
});
