import request from 'supertest';
import app from '../../app.js';
import { prisma } from '../../config/prismaClient.js';

jest.mock('../../config/prismaClient.js', () => ({
  prisma: {
    tracker: {},
    position: {},
  }
}));

// mock auth middleware to bypass JWT checks
jest.mock('../../middleware/authMiddleware.js', () => {
  return {
    authMiddleware: (req, res, next) => {
      req.user = { userId: 'u1', role: 'owner' };
      return next();
    }
  };
});

beforeEach(() => jest.resetAllMocks());

describe('Positions API integration (mocked DB)', () => {
  test('POST /api/positions inserts a single position', async () => {
    prisma.tracker.findUnique = jest.fn().mockResolvedValue({ id: 't1', userId: 'u1' });
    prisma.position.findFirst = jest.fn().mockResolvedValue(null);
    prisma.position.create = jest.fn().mockResolvedValue({ id: 'p1', trackerId: 't1' });

    const token = 'dummy';
    const res = await request(app)
      .post('/api/positions')
      .set('Authorization', `Bearer ${token}`)
      .send({ trackerImei: 'imei1', latitude: 1, longitude: 2, timestamp: new Date().toISOString() });

  expect(res.status).toBe(201);
  expect(res.body.data).toHaveProperty('id', 'p1');
  });

  test('POST /api/positions/bulk inserts bulk and returns inserted count', async () => {
    prisma.tracker.findMany = jest.fn().mockResolvedValue([{ id: 't1', imei: 'imei1', userId: 'u1' }]);
    prisma.position.findMany = jest.fn().mockResolvedValue([]);
    prisma.position.createMany = jest.fn().mockResolvedValue({ count: 2 });

    const res = await request(app)
      .post('/api/positions/bulk')
      .set('Authorization', 'Bearer dummy')
      .send([{ trackerImei: 'imei1', latitude: 1, longitude: 2, timestamp: new Date().toISOString() }, { trackerImei: 'imei1', latitude: 1.1, longitude: 2.1, timestamp: new Date().toISOString() }]);

  expect(res.status).toBe(200);
  expect(res.body.data).toHaveProperty('inserted');
  });
});
