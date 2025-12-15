jest.mock('../../config/prismaClient.js', () => ({
  prisma: {
    plan: { findUnique: jest.fn() },
    subscription: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  }
}));

jest.mock('../../core/events/index.js', () => ({ emit: jest.fn() }));

describe('subscriptions.service.changeUserPlan', () => {
  beforeEach(() => jest.clearAllMocks());

  test('creates a subscription when none exists', async () => {
    const prismaModule = await import('../../config/prismaClient.js');
    prismaModule.prisma.plan.findUnique.mockResolvedValue({ id: 'p1', key: 'starter', freeTrialDays: 3 });
    prismaModule.prisma.subscription.findFirst.mockResolvedValue(null);
    prismaModule.prisma.subscription.create.mockResolvedValue({ id: 's1', userId: 'u1', planId: 'p1' });

    const svc = await import('../../modules/subscriptions/subscriptions.service.js');
    const res = await svc.changeUserPlan('u1', 'starter');

    expect(res).toHaveProperty('id', 's1');
    expect(prismaModule.prisma.subscription.create).toHaveBeenCalled();
  });

  test('updates existing subscription when present', async () => {
    const prismaModule = await import('../../config/prismaClient.js');
    prismaModule.prisma.plan.findUnique.mockResolvedValue({ id: 'p2', key: 'pro', freeTrialDays: 2 });
    prismaModule.prisma.subscription.findFirst.mockResolvedValue({ id: 's2', userId: 'u2', planId: 'p1' });
    prismaModule.prisma.subscription.update.mockResolvedValue({ id: 's2', userId: 'u2', planId: 'p2' });

    const svc = await import('../../modules/subscriptions/subscriptions.service.js');
    const res = await svc.changeUserPlan('u2', 'pro');

    expect(res).toHaveProperty('id', 's2');
    expect(prismaModule.prisma.subscription.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 's2' }, data: expect.any(Object) }));
  });
});
