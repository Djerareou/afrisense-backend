// tests/positions/positions.unit.test.js
import { positionSchema } from '../../modules/positions/positions.schema.js';
import { ingestPosition } from '../../modules/positions/positions.service.js';
import { prisma } from '../../config/prismaClient.js';

jest.mock('../../config/prismaClient.js', () => ({
  prisma: {
    tracker: { findUnique: jest.fn() },
    position: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn(),
  }
}));

describe('Positions unit tests', () => {
  beforeEach(() => jest.clearAllMocks());

  test('schema accepts valid payload', () => {
    const payload = {
      trackerId: '00000000-0000-0000-0000-000000000000',
      latitude: 6.5,
      longitude: 3.4,
      timestamp: new Date().toISOString(),
    };
    expect(() => positionSchema.parse(payload)).not.toThrow();
  });

  test('ingestPosition inserts when tracker resolved by IMEI and no duplicate', async () => {
    prisma.tracker.findUnique.mockResolvedValue({ id: 't1', userId: 'u1' });
    prisma.position.findFirst.mockResolvedValue(null);
    prisma.position.create.mockResolvedValue({ id: 'p1', latitude: 6.5 });

    const payload = {
      trackerImei: '8675309',
      latitude: 6.5,
      longitude: 3.4,
      timestamp: new Date().toISOString(),
    };

    const inserted = await ingestPosition(payload, { userId: 'u1', role: 'owner' });
    expect(prisma.position.create).toHaveBeenCalled();
    expect(inserted).toBeDefined();
  });
});
