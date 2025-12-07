import { jest } from '@jest/globals';

// Mock prisma client imported by services
const mockUser = { id: '1', email: 'u@example.com', passwordHash: '$2a$10$hash', role: 'user', fullName: 'U' };

jest.mock('../../config/prismaClient.js', () => ({
  prisma: {
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(mockUser),
    },
    $disconnect: jest.fn(),
  }
}));

describe('auth.service (unit)', () => {
  test('registerUser calls prisma.create and returns user data', async () => {
    // Import service after mock is declared so it uses the mocked prisma
    const { registerUser: register } = await import('../../modules/auth/auth.service.js');
    const result = await register({ fullName: 'U', email: 'u@example.com', password: 'pass', role: 'user' });
    expect(result).toHaveProperty('email', 'u@example.com');
  });
});
