// Unit tests for positions service
jest.mock('../../modules/positions/positions.model.js', () => ({
  createPosition: jest.fn().mockResolvedValue({ id: 'p1' }),
  findPositionByTrackerAndTimestamp: jest.fn().mockResolvedValue(null),
  findLatestPositionByTracker: jest.fn().mockResolvedValue(null),
  createPositionsBulk: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../config/prismaClient.js', () => ({
  prisma: {
    tracker: {
      findUnique: jest.fn().mockResolvedValue({ id: 't1', userId: 'u1' }),
      findMany: jest.fn().mockResolvedValue([{ id: 't1', imei: '123456789012345', userId: 'u1' }]),
    },
    position: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

describe('positions.service', () => {
  test('ingestPosition creates position', async () => {
    const { ingestPosition } = await import('../../modules/positions/positions.service.js');
    const payload = { trackerImei: '123456789012345', latitude: 10, longitude: 10, timestamp: new Date().toISOString() };
    const res = await ingestPosition(payload, { userId: 'u1', role: 'owner' });
    expect(res).toHaveProperty('id', 'p1');
  });

  test('ingestPosition recovers on P2002 by returning existing', async () => {
    const model = await import('../../modules/positions/positions.model.js');
    // make createPosition throw P2002 once
    model.createPosition.mockRejectedValueOnce({ code: 'P2002' });
    // ensure prisma.position.findFirst returns null first (idempotence check), then returns existing after create failure
    const prismaModule = await import('../../config/prismaClient.js');
    prismaModule.prisma.position.findFirst = jest.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'existing', externalId: 'ext-1' });

    const { ingestPosition } = await import('../../modules/positions/positions.service.js');
    const payload = { trackerImei: '123456789012345', latitude: 11, longitude: 11, timestamp: new Date().toISOString(), externalId: 'ext-1' };
    const res = await ingestPosition(payload, { userId: 'u1', role: 'owner' });
    expect(res).toHaveProperty('id', 'existing');
  });
});
