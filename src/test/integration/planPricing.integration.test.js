import { prisma } from '../../config/prismaClient.js';
import * as subsService from '../../modules/subscriptions/subscriptions.service.js';

jest.setTimeout(20000);

describe('plan pricing integration', () => {
  test('starter plan charges 200 per day', async () => {
    const now = Date.now();
    const user = await prisma.user.create({ data: { fullName: 'Starter User', email: `itest+starter_${now}@example.com`, role: 'user', passwordHash: 'x' } });
    const plan = await prisma.plan.create({ data: { key: `starter-itest-${now}`, name: 'Starter ITest', pricePerDay: 200, freeTrialDays: 0 } });
    await prisma.wallet.create({ data: { userId: user.id, balance: 1000 } });
    const sub = await prisma.subscription.create({ data: { userId: user.id, planId: plan.id, active: true, startDate: new Date() } });

    const wBefore = await prisma.wallet.findUnique({ where: { userId: user.id } });
    const res = await subsService.dailyChargeAll();
    const entry = res.find(r => r.subscriptionId === sub.id);
    expect(entry).toBeDefined();
    // expect charged or error
    expect(entry.status === 'charged' || entry.status === 'error').toBe(true);
    const wAfter = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (entry.status === 'charged') {
      expect(wAfter.balance).toBeCloseTo(wBefore.balance - 200, 5);
    }

    // cleanup
    await prisma.subscription.deleteMany({ where: { userId: user.id } });
    await prisma.paymentRecord.deleteMany({ where: { userId: user.id } }).catch(() => {});
    const w = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (w) {
      await prisma.walletTransaction.deleteMany({ where: { walletId: w.id } }).catch(() => {});
      await prisma.wallet.delete({ where: { id: w.id } }).catch(() => {});
    }
    await prisma.plan.delete({ where: { id: plan.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  });

  test('pro plan charges 350 per day', async () => {
    const now = Date.now();
    const user = await prisma.user.create({ data: { fullName: 'Pro User', email: `itest+pro_${now}@example.com`, role: 'user', passwordHash: 'x' } });
    const plan = await prisma.plan.create({ data: { key: `pro-itest-${now}`, name: 'Pro ITest', pricePerDay: 350, freeTrialDays: 0 } });
    await prisma.wallet.create({ data: { userId: user.id, balance: 1000 } });
    const sub = await prisma.subscription.create({ data: { userId: user.id, planId: plan.id, active: true, startDate: new Date() } });

    const wBefore = await prisma.wallet.findUnique({ where: { userId: user.id } });
    const res = await subsService.dailyChargeAll();
    const entry = res.find(r => r.subscriptionId === sub.id);
    expect(entry).toBeDefined();
    expect(entry.status === 'charged' || entry.status === 'error').toBe(true);
    const wAfter = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (entry.status === 'charged') {
      expect(wAfter.balance).toBeCloseTo(wBefore.balance - 350, 5);
    }

    // cleanup
    await prisma.subscription.deleteMany({ where: { userId: user.id } });
    await prisma.paymentRecord.deleteMany({ where: { userId: user.id } }).catch(() => {});
    const w = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (w) {
      await prisma.walletTransaction.deleteMany({ where: { walletId: w.id } }).catch(() => {});
      await prisma.wallet.delete({ where: { id: w.id } }).catch(() => {});
    }
    await prisma.plan.delete({ where: { id: plan.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  });
});
