// Mock prisma before any imports
jest.mock('../../config/prismaClient.js', () => ({
  prisma: {
    tracker: {
      findUnique: jest.fn(),
      findMany: jest.fn()
    },
    position: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      createMany: jest.fn(),
      create: jest.fn()
    }
  }
}));

import * as positionsRepository from '../../modules/positions/positions.repository.js';
import { prisma } from '../../config/prismaClient.js';

describe('positions.repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findTrackerById', () => {
    test('finds tracker by id', async () => {
      const mockTracker = {
        id: 't1',
        imei: '123456789',
        label: 'Test Tracker'
      };

      prisma.tracker.findUnique.mockResolvedValue(mockTracker);

      const result = await positionsRepository.findTrackerById('t1');

      expect(result).toEqual(mockTracker);
      expect(prisma.tracker.findUnique).toHaveBeenCalledWith({
        where: { id: 't1' }
      });
    });

    test('returns null when tracker not found', async () => {
      prisma.tracker.findUnique.mockResolvedValue(null);

      const result = await positionsRepository.findTrackerById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findTrackerByImei', () => {
    test('finds tracker by IMEI', async () => {
      const mockTracker = {
        id: 't1',
        imei: '123456789',
        label: 'Test Tracker'
      };

      prisma.tracker.findUnique.mockResolvedValue(mockTracker);

      const result = await positionsRepository.findTrackerByImei('123456789');

      expect(result).toEqual(mockTracker);
      expect(prisma.tracker.findUnique).toHaveBeenCalledWith({
        where: { imei: '123456789' }
      });
    });
  });

  describe('findPositionByExternalId', () => {
    test('finds position by external ID', async () => {
      const mockPosition = {
        id: 'p1',
        externalId: 'ext123',
        trackerId: 't1'
      };

      prisma.position.findUnique.mockResolvedValue(mockPosition);

      const result = await positionsRepository.findPositionByExternalId('ext123');

      expect(result).toEqual(mockPosition);
      expect(prisma.position.findUnique).toHaveBeenCalledWith({
        where: { externalId: 'ext123' }
      });
    });
  });

  describe('findTrackersByImeis', () => {
    test('finds multiple trackers by IMEIs', async () => {
      const mockTrackers = [
        { id: 't1', imei: '111' },
        { id: 't2', imei: '222' }
      ];

      prisma.tracker.findMany.mockResolvedValue(mockTrackers);

      const result = await positionsRepository.findTrackersByImeis(['111', '222']);

      expect(result).toEqual(mockTrackers);
      expect(prisma.tracker.findMany).toHaveBeenCalledWith({
        where: {
          imei: { in: ['111', '222'] }
        }
      });
    });
  });

  describe('findPositionsByExternalIds', () => {
    test('finds multiple positions by external IDs', async () => {
      const mockPositions = [
        { id: 'p1', externalId: 'ext1' },
        { id: 'p2', externalId: 'ext2' }
      ];

      prisma.position.findMany.mockResolvedValue(mockPositions);

      const result = await positionsRepository.findPositionsByExternalIds(['ext1', 'ext2']);

      expect(result).toEqual(mockPositions);
      expect(prisma.position.findMany).toHaveBeenCalledWith({
        where: {
          externalId: { in: ['ext1', 'ext2'] }
        }
      });
    });
  });

  describe('findTrackersByIds', () => {
    test('finds trackers by multiple IDs', async () => {
      const mockTrackers = [
        { id: 't1', label: 'Tracker 1' },
        { id: 't2', label: 'Tracker 2' }
      ];

      prisma.tracker.findMany.mockResolvedValue(mockTrackers);

      const result = await positionsRepository.findTrackersByIds(['t1', 't2']);

      expect(result).toEqual(mockTrackers);
      expect(prisma.tracker.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['t1', 't2'] }
        }
      });
    });

    test('returns empty array when no IDs provided', async () => {
      prisma.tracker.findMany.mockResolvedValue([]);

      const result = await positionsRepository.findTrackersByIds([]);

      expect(result).toEqual([]);
    });
  });
});
