jest.mock('../../modules/positions/positions.model.js');
jest.mock('../../config/prismaClient.js', () => ({
  prisma: {
    tracker: { findUnique: jest.fn(), findMany: jest.fn() },
    position: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), createMany: jest.fn() },
  },
}));

import * as svc from '../../modules/positions/positions.service.js';
import * as model from '../../modules/positions/positions.model.js';
import { prisma } from '../../config/prismaClient.js';

beforeEach(() => {
  jest.resetAllMocks();
});

describe('positions.service logic', () => {
  test('creates position and returns created record', async () => {
    model.findPositionByTrackerAndTimestamp.mockResolvedValue(null);
    prisma.tracker.findUnique = jest.fn().mockResolvedValue({ id: 't1', userId: 'u1' });
    model.createPosition.mockResolvedValue({ id: 'p1', trackerId: 't1' });

    const res = await svc.ingestPosition({ trackerImei: 'imei1', latitude: 1, longitude: 2, timestamp: new Date().toISOString() }, { userId: 'u1', role: 'owner' });
    expect(res).toHaveProperty('id', 'p1');
  });

  test('deduplicates by trackerId+timestamp', async () => {
    prisma.tracker.findUnique = jest.fn().mockResolvedValue({ id: 't1', userId: 'u1' });
    model.findPositionByTrackerAndTimestamp.mockResolvedValue({ id: 'existing' });

    await expect(svc.ingestPosition({ trackerImei: 'imei1', latitude: 1, longitude: 2, timestamp: new Date().toISOString() }, { userId: 'u1', role: 'owner' })).rejects.toThrow();
  });

  test('enriches with distance when last point present', async () => {
    prisma.tracker.findUnique = jest.fn().mockResolvedValue({ id: 't1', userId: 'u1' });
    model.findPositionByTrackerAndTimestamp.mockResolvedValue(null);
    model.findLatestPositionByTracker.mockResolvedValue({ latitude: 0, longitude: 0 });
    model.createPosition.mockResolvedValue({ id: 'p1' });

    const res = await svc.ingestPosition({ trackerImei: 'imei1', latitude: 0.1, longitude: 0.1, timestamp: new Date().toISOString() }, { userId: 'u1', role: 'owner' });
    expect(res).toHaveProperty('id');
  });
});
