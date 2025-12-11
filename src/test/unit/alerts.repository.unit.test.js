// Mock prisma before any imports
jest.mock('../../config/prismaClient.js', () => ({
  prisma: {
    alert: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    alertSetting: {
      findUnique: jest.fn(),
      upsert: jest.fn()
    },
    alertDeliveryLog: {
      create: jest.fn()
    }
  }
}));

import * as alertsRepository from '../../modules/alerts/alerts.repository.js';
import { prisma } from '../../config/prismaClient.js';

describe('alerts.repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAlert', () => {
    test('creates alert with required fields', async () => {
      const mockAlert = {
        id: 'a1',
        trackerId: 't1',
        positionId: 'p1',
        type: 'OVERSPEED',
        timestamp: new Date(),
        meta: '{"speed":120}'
      };

      prisma.alert.create.mockResolvedValue(mockAlert);

      const data = {
        trackerId: 't1',
        positionId: 'p1',
        type: 'OVERSPEED',
        meta: '{"speed":120}'
      };

      const result = await alertsRepository.createAlert(data);

      expect(result).toEqual(mockAlert);
      expect(prisma.alert.create).toHaveBeenCalledWith({
        data,
        include: {
          tracker: true,
          geofence: true
        }
      });
    });

    test('creates alert with optional geofenceId', async () => {
      const mockAlert = {
        id: 'a2',
        trackerId: 't1',
        positionId: 'p1',
        geofenceId: 'g1',
        type: 'GEOFENCE_ENTER'
      };

      prisma.alert.create.mockResolvedValue(mockAlert);

      const data = {
        trackerId: 't1',
        positionId: 'p1',
        geofenceId: 'g1',
        type: 'GEOFENCE_ENTER'
      };

      await alertsRepository.createAlert(data);

      expect(prisma.alert.create).toHaveBeenCalledWith({
        data,
        include: {
          tracker: true,
          geofence: true
        }
      });
    });
  });

  describe('findAlerts', () => {
    test('finds alerts with filters', async () => {
      const mockAlerts = [
        { id: 'a1', type: 'OVERSPEED', trackerId: 't1' },
        { id: 'a2', type: 'OVERSPEED', trackerId: 't1' }
      ];

      prisma.alert.findMany.mockResolvedValue(mockAlerts);

      const filters = { type: 'OVERSPEED', trackerId: 't1' };
      const options = { skip: 0, take: 10 };

      const result = await alertsRepository.findAlerts(filters, options);

      expect(result).toEqual(mockAlerts);
      expect(prisma.alert.findMany).toHaveBeenCalledWith({
        where: filters,
        include: {
          tracker: true,
          geofence: true
        },
        orderBy: { timestamp: 'desc' },
        ...options
      });
    });

    test('filters by user tracker IDs', async () => {
      prisma.alert.findMany.mockResolvedValue([]);

      const filters = { userTrackerIds: ['t1', 't2'] };
      const options = {};

      await alertsRepository.findAlerts(filters, options);

      expect(prisma.alert.findMany).toHaveBeenCalledWith({
        where: {
          trackerId: { in: ['t1', 't2'] }
        },
        include: {
          tracker: true,
          geofence: true
        },
        orderBy: { timestamp: 'desc' }
      });
    });
  });

  describe('findRecentSimilarAlerts', () => {
    test('finds similar alerts within time window', async () => {
      const mockAlerts = [
        { id: 'a1', type: 'OVERSPEED', trackerId: 't1', timestamp: new Date() }
      ];

      prisma.alert.findMany.mockResolvedValue(mockAlerts);

      const criteria = {
        trackerId: 't1',
        type: 'OVERSPEED',
        windowSeconds: 120
      };

      const result = await alertsRepository.findRecentSimilarAlerts(criteria);

      expect(result).toEqual(mockAlerts);
      expect(prisma.alert.findMany).toHaveBeenCalled();

      const callArgs = prisma.alert.findMany.mock.calls[0][0];
      expect(callArgs.where.trackerId).toBe('t1');
      expect(callArgs.where.type).toBe('OVERSPEED');
      expect(callArgs.where.timestamp).toHaveProperty('gte');
    });

    test('includes geofenceId filter when provided', async () => {
      prisma.alert.findMany.mockResolvedValue([]);

      const criteria = {
        trackerId: 't1',
        type: 'GEOFENCE_ENTER',
        geofenceId: 'g1',
        windowSeconds: 120
      };

      await alertsRepository.findRecentSimilarAlerts(criteria);

      const callArgs = prisma.alert.findMany.mock.calls[0][0];
      expect(callArgs.where.geofenceId).toBe('g1');
    });

    test('handles null geofenceId correctly', async () => {
      prisma.alert.findMany.mockResolvedValue([]);

      const criteria = {
        trackerId: 't1',
        type: 'OVERSPEED',
        geofenceId: undefined,
        windowSeconds: 120
      };

      await alertsRepository.findRecentSimilarAlerts(criteria);

      const callArgs = prisma.alert.findMany.mock.calls[0][0];
      expect(callArgs.where).toHaveProperty('geofenceId');
    });
  });

  describe('deleteAlert', () => {
    test('deletes alert by id', async () => {
      const mockAlert = { id: 'a1', trackerId: 't1' };
      prisma.alert.delete.mockResolvedValue(mockAlert);

      const result = await alertsRepository.deleteAlert('a1');

      expect(result).toEqual(mockAlert);
      expect(prisma.alert.delete).toHaveBeenCalledWith({
        where: { id: 'a1' }
      });
    });
  });

  describe('getUserAlertSettings', () => {
    test('returns user alert settings', async () => {
      const mockSettings = {
        userId: 'u1',
        enabled: true,
        channels: '{"email":true}',
        thresholds: '{"overspeed":100}'
      };

      prisma.alertSetting.findUnique.mockResolvedValue(mockSettings);

      const result = await alertsRepository.getUserAlertSettings('u1');

      expect(result).toEqual(mockSettings);
      expect(prisma.alertSetting.findUnique).toHaveBeenCalledWith({
        where: { userId: 'u1' }
      });
    });

    test('returns null when settings not found', async () => {
      prisma.alertSetting.findUnique.mockResolvedValue(null);

      const result = await alertsRepository.getUserAlertSettings('u1');

      expect(result).toBeNull();
    });
  });

  describe('createDeliveryLog', () => {
    test('creates delivery log', async () => {
      const mockLog = {
        id: 'dl1',
        alertId: 'a1',
        channel: 'email',
        status: 'success'
      };

      prisma.alertDeliveryLog.create.mockResolvedValue(mockLog);

      const data = {
        alertId: 'a1',
        channel: 'email',
        status: 'success'
      };

      const result = await alertsRepository.createDeliveryLog(data);

      expect(result).toEqual(mockLog);
      expect(prisma.alertDeliveryLog.create).toHaveBeenCalledWith({ data });
    });
  });
});
