import request from 'supertest';
import app from '../../app.js';
import { prisma } from '../../config/prismaClient.js';

describe('Trackers integration (REST)', () => {
  let token;
  let createdTrackerId;
  const uniqueEmail = `ti+${Date.now()}@example.com`;
  const uniqueImei = `999888777${Date.now().toString().slice(-6)}`;

  beforeAll(async () => {
    // create user and login to get token (reuse auth flow)
    await request(app)
      .post('/api/auth/register')
      .send({ fullName: 'TI User', email: uniqueEmail, phone: '12345678', password: 'Password@123', role: 'owner' });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: uniqueEmail, password: 'Password@123' });

    token = loginRes.body.data.token;
  });

  afterAll(async () => {
    // cleanup: remove created trackers and user
    if (createdTrackerId) {
      await prisma.tracker.deleteMany({ where: { id: createdTrackerId } });
    }
    await prisma.user.deleteMany({ where: { email: uniqueEmail } });
    await prisma.$disconnect();
  });

  test('POST /api/trackers creates a tracker', async () => {
    const res = await request(app)
      .post('/api/trackers')
      .set('Authorization', `Bearer ${token}`)
      .send({ imei: uniqueImei, protocol: 'gt06' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    createdTrackerId = res.body.id;
  });

  test('GET /api/trackers returns list', async () => {
    const res = await request(app)
      .get('/api/trackers')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/trackers/:id returns tracker', async () => {
    const res = await request(app)
      .get(`/api/trackers/${createdTrackerId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', createdTrackerId);
  });

  test('PUT /api/trackers/:id updates tracker', async () => {
    const res = await request(app)
      .put(`/api/trackers/${createdTrackerId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ label: 'Updated Label' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('label', 'Updated Label');
  });

  test('DELETE /api/trackers/:id removes tracker', async () => {
    const res = await request(app)
      .delete(`/api/trackers/${createdTrackerId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
    createdTrackerId = null; // already deleted
  });
});
