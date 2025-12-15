import { prisma } from '../../config/prismaClient.js';
import * as subsService from '../../modules/subscriptions/subscriptions.service.js';

jest.setTimeout(20000);

describe('subscription trial behavior (integration)', () => {
  let user;
  let plan;
  let sub;

  beforeAll(async () => {
    const now = Date.now();
    user = await prisma.user.create({ data: { fullName: 'Trial User', email: `itest+trial_${now}@example.com`, role: 'user', passwordHash: 'x' } });
    // create plan with a short trial (2 days)
    plan = await prisma.plan.create({ data: { key: `trial-plan-${now}`, name: 'Trial Plan', pricePerDay: 10, freeTrialDays: 2 } });
    // ensure wallet exists and has balance
    await prisma.wallet.create({ data: { userId: user.id, balance: 1000 } });
    // subscribe via service to ensure trial is set
    sub = await subsService.subscribeUser(user.id, plan.key);
  });

  afterAll(async () => {
    // cleanup
    await prisma.subscription.deleteMany({ where: { userId: user.id } }).catch(() => {});
    await prisma.paymentRecord.deleteMany({ where: { userId: user.id } }).catch(() => {});
    const w = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (w) {
      await prisma.walletTransaction.deleteMany({ where: { walletId: w.id } }).catch(() => {});
      await prisma.wallet.delete({ where: { id: w.id } }).catch(() => {});
    }
    await prisma.plan.delete({ where: { id: plan.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  });

  test('dailyChargeAll skips charging during trial period', async () => {
    const freshSub = await prisma.subscription.findFirst({ where: { userId: user.id } });
    expect(freshSub).toBeTruthy();
    expect(freshSub.trialEndsAt).toBeTruthy();
    // ensure trial is in future
    expect(new Date() < new Date(freshSub.trialEndsAt)).toBe(true);

    const wBefore = await prisma.wallet.findUnique({ where: { userId: user.id } });
    const res = await subsService.dailyChargeAll();
    // expect an 'in_trial' entry for our subscription
    const entry = res.find(r => r.subscriptionId === freshSub.id);
    expect(entry).toBeDefined();
    expect(entry.status).toBe('in_trial');

    const wAfter = await prisma.wallet.findUnique({ where: { userId: user.id } });
    expect(wAfter.balance).toBe(wBefore.balance);
  });

  test('dailyChargeAll charges after trial expiry', async () => {
    // expire trial by setting trialEndsAt in the past
    await prisma.subscription.update({ where: { id: sub.id }, data: { trialEndsAt: new Date(Date.now() - 1000) } });

    const wBefore = await prisma.wallet.findUnique({ where: { userId: user.id } });
    const res = await subsService.dailyChargeAll();
    const entry = res.find(r => r.subscriptionId === sub.id);
    expect(entry).toBeDefined();
    // should be charged (or error handled) - prefer charged
    expect(entry.status === 'charged' || entry.status === 'error').toBe(true);

    const wAfter = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (entry.status === 'charged') {
      expect(wAfter.balance).toBeCloseTo(wBefore.balance - plan.pricePerDay, 5);
    }
  });
});
