// Mock prisma before any imports
jest.mock('../../config/prismaClient.js', () => ({
  prisma: {
    trackerConfigLog: {
      create: jest.fn()
    }
  }
}));

import * as trackersRepository from '../../modules/trackers/trackers.repository.js';
import { prisma } from '../../config/prismaClient.js';

describe('trackers.repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createConfigLog', () => {
    test('creates config log with all fields', async () => {
      const mockLog = {
        id: 'log1',
        trackerId: 't1',
        configKey: 'interval',
        oldValue: '60',
        newValue: '30',
        changedBy: 'admin',
        timestamp: new Date()
      };

      prisma.trackerConfigLog.create.mockResolvedValue(mockLog);

      const data = {
        trackerId: 't1',
        configKey: 'interval',
        oldValue: '60',
        newValue: '30',
        changedBy: 'admin'
      };

      const result = await trackersRepository.createConfigLog(data);

      expect(result).toEqual(mockLog);
      expect(prisma.trackerConfigLog.create).toHaveBeenCalledWith({
        data
      });
    });

    test('creates config log without oldValue', async () => {
      const mockLog = {
        id: 'log2',
        trackerId: 't1',
        configKey: 'mode',
        oldValue: null,
        newValue: 'active',
        changedBy: 'user1'
      };

      prisma.trackerConfigLog.create.mockResolvedValue(mockLog);

      const data = {
        trackerId: 't1',
        configKey: 'mode',
        newValue: 'active',
        changedBy: 'user1'
      };

      await trackersRepository.createConfigLog(data);

      expect(prisma.trackerConfigLog.create).toHaveBeenCalledWith({
        data
      });
    });
  });
});
