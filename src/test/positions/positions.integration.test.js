// tests/positions/positions.integration.test.js
import request from 'supertest';
import app from '../../src/app.js';
import { prisma } from '../../src/config/prismaClient.js';

jest.mock('../../src/config/prismaClient.js', () => ({
  tracker: { findUnique: jest.fn() },
  position: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn() },
  $transaction: jest.fn(),
}));

// mock auth middleware to set req.user
jest.mock('../../src/middleware/authMiddleware.js', () => {
  return {
    authMiddleware: (req, res, next) => {
      req.user = { userId: 'u1', role: 'owner' };
      return next();
    }
  };
});

describe('Positions routes integration (mocked DB)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('POST /api/positions inserts position', async () => {
    prisma.tracker.findUnique.mockResolvedValue({ id: 't1', userId: 'u1' });
    prisma.position.findFirst.mockResolvedValue(null);
    prisma.position.create.mockResolvedValue({ id: 'p1', trackerId: 't1' });

    const res = await request(app)
      .post('/api/positions')
      .send({
        trackerImei: '8675309',
        latitude: 6.5,
        longitude: 3.4,
        timestamp: new Date().toISOString()
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(prisma.position.create).toHaveBeenCalled();
  });

  test('POST /api/positions duplicate returns 400', async () => {
    prisma.tracker.findUnique.mockResolvedValue({ id: 't1', userId: 'u1' });
    prisma.position.findFirst.mockResolvedValue({ id: 'p1' });

    const res = await request(app)
      .post('/api/positions')
      .send({
        trackerImei: '8675309',
        latitude: 6.5,
        longitude: 3.4,
        timestamp: new Date().toISOString()
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
