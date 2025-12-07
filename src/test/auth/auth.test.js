// src/test/auth/auth.test.js
import request from 'supertest';
import app from '../../app.js';
import { prisma } from '../../config/prismaClient.js';

describe('Module Auth', () => {

  const testUser = {
    fullName: 'John Doe',
    email: `john+${Date.now()}@example.com`,
    phone: '1234567890',
    password: 'P@ssw0rd123',
    role: 'fleet_manager'
  };

  afterAll(async () => {
    // Nettoyage de la base de données
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    await prisma.$disconnect();
  });

  test('POST /api/auth/register - crée un utilisateur', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

  expect(res.statusCode).toBe(201);
  expect(res.body).toHaveProperty('data');
  expect(res.body.data.email).toBe(testUser.email);
  });

  test('POST /api/auth/register - email déjà utilisé', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
    // message en français attendu, on vérifie seulement qu'il existe
    expect(typeof res.body.error).toBe('string');
  });

  test('POST /api/auth/login - connexion réussie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data).toHaveProperty('user');
  });

  test('POST /api/auth/login - mauvais mot de passe', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'wrongpass' });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error');
    // message en français attendu, on vérifie seulement qu'il existe
    expect(typeof res.body.error).toBe('string');
  });

  test('GET /api/auth/me - accès route protégée', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    const token = loginRes.body.data.token;

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data.email).toBe(testUser.email);
  });
  // Note: no logout route implemented currently; skipping logout test.

});
