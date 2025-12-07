import request from 'supertest';
import app from '../../app.js';
import { prisma } from '../../config/prismaClient.js';

jest.mock('../../config/prismaClient.js');

beforeEach(() => jest.resetAllMocks());

describe('Alerts API integration (mocked DB)', () => {
  test('POST /api/alerts creates alert and logs delivery', async () => {
    prisma.tracker.findUnique = jest.fn().mockResolvedValue({ id: 't1', userId: 'u1' });
    prisma.alertSetting.findUnique = jest.fn().mockResolvedValue({ userId: 'u1', channels: JSON.stringify(['CONSOLE']), thresholds: JSON.stringify({ overspeed: 100, lowBattery: 20 }), enabled: true });
    prisma.alert.create = jest.fn().mockResolvedValue({ id: 'a1' });
    prisma.alertDeliveryLog.create = jest.fn().mockResolvedValue({ id: 'dl1' });

    const res = await request(app)
      .post('/api/alerts')
      .send({ userId: 'u1', trackerId: 't1', positionId: 'p1', type: 'OVERSPEED', severity: 'WARNING' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id', 'a1');
    expect(prisma.alert.create).toHaveBeenCalled();
    expect(prisma.alertDeliveryLog.create).toHaveBeenCalled();
  });
});
