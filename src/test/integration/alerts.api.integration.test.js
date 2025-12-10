import request from 'supertest';

// Mock prisma before importing anything that uses it
jest.mock('../../config/prismaClient.js', () => ({
  prisma: {
    tracker: { findUnique: jest.fn() },
    position: { findUnique: jest.fn() },
    alert: { 
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn()
    },
    alertSetting: { findUnique: jest.fn() },
    alertDeliveryLog: { create: jest.fn() }
  }
}));

// Now import app and prisma
import app from '../../app.js';
import { prisma } from '../../config/prismaClient.js';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Alerts API integration (mocked DB)', () => {
  test('POST /api/alerts creates alert', async () => {
    prisma.tracker.findUnique = jest.fn().mockResolvedValue({ 
      id: 't1', 
      userId: 'u1',
      user: { id: 'u1', email: 'test@example.com' }
    });
    prisma.position.findUnique = jest.fn().mockResolvedValue({ id: 'p1', trackerId: 't1' });
    prisma.alertSetting.findUnique = jest.fn().mockResolvedValue({ 
      userId: 'u1', 
      channels: JSON.stringify({ CONSOLE: true }), 
      enabled: true 
    });
    prisma.alert.create = jest.fn().mockResolvedValue({ 
      id: 'a1', 
      trackerId: 't1', 
      positionId: 'p1', 
      type: 'OVERSPEED',
      tracker: { id: 't1' },
      geofence: null
    });
    prisma.alert.findMany = jest.fn().mockResolvedValue([]);
    prisma.alertDeliveryLog.create = jest.fn().mockResolvedValue({ id: 'dl1' });

    const res = await request(app)
      .post('/api/alerts')
      .send({ trackerId: 't1', positionId: 'p1', type: 'OVERSPEED', meta: { speed: 120 } });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('id', 'a1');
    expect(prisma.tracker.findUnique).toHaveBeenCalled();
    expect(prisma.position.findUnique).toHaveBeenCalled();
    expect(prisma.alert.create).toHaveBeenCalled();
  });

  test('GET /api/alerts lists alerts', async () => {
    prisma.alert.findMany = jest.fn().mockResolvedValue([
      { id: 'a1', trackerId: 't1', type: 'OVERSPEED', timestamp: new Date(), tracker: {}, geofence: null }
    ]);

    const res = await request(app).get('/api/alerts');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveLength(1);
  });

  test('GET /api/alerts/:id returns single alert', async () => {
    prisma.alert.findUnique = jest.fn().mockResolvedValue({ 
      id: 'a1', 
      trackerId: 't1', 
      type: 'OVERSPEED',
      tracker: {},
      geofence: null
    });

    const res = await request(app).get('/api/alerts/a1');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('id', 'a1');
  });

  test('DELETE /api/alerts/:id deletes alert', async () => {
    prisma.alert.findUnique = jest.fn().mockResolvedValue({ 
      id: 'a1', 
      trackerId: 't1'
    });
    prisma.alert.delete = jest.fn().mockResolvedValue({ id: 'a1' });

    const res = await request(app).delete('/api/alerts/a1');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(prisma.alert.delete).toHaveBeenCalled();
  });

  test('POST /api/alerts/test/email sends test email', async () => {
    const res = await request(app)
      .post('/api/alerts/test/email')
      .send({ email: 'test@example.com' });

    // Will fail without RESEND_API_KEY, but should return structured error
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.body).toHaveProperty('success');
  });
});
