import { prisma } from '../../config/prismaClient.js';
import * as subsService from '../../modules/subscriptions/subscriptions.service.js';
import * as walletService from '../../modules/wallet/wallet.service.js';

jest.setTimeout(20000);

describe('dailyChargeAll integration', () => {
  let user;
  let plan;
  let subscription;

  beforeAll(async () => {
    // create unique test user + plan
    const now = Date.now();
    user = await prisma.user.create({ data: { fullName: 'ITest User', email: `itest+daily_${now}@example.com`, role: 'user', passwordHash: 'x' } });
    plan = await prisma.plan.create({ data: { key: `itest-plan-${now}`, name: 'Integration Test Plan', pricePerDay: 10 } });
    // ensure wallet exists with zero balance
    await prisma.wallet.create({ data: { userId: user.id, balance: 0 } });
    subscription = await prisma.subscription.create({ data: { userId: user.id, planId: plan.id, active: true, startDate: new Date() } });
  });

  afterAll(async () => {
    // cleanup everything created for test
    await prisma.subscription.deleteMany({ where: { userId: user.id } });
    await prisma.paymentRecord.deleteMany({ where: { userId: user.id } });
    const w = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (w) {
      await prisma.walletTransaction.deleteMany({ where: { walletId: w.id } }).catch(() => {});
      await prisma.wallet.delete({ where: { id: w.id } }).catch(() => {});
    }
    await prisma.plan.delete({ where: { id: plan.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  });

  test('suspends after 3 failed charges and reactivates after topup', async () => {
    // run dailyChargeAll 3 times to exhaust retries and suspend
    await subsService.dailyChargeAll();
    let s = await prisma.subscription.findUnique({ where: { id: subscription.id } });
    expect(s.retryCount).toBe(1);

    await subsService.dailyChargeAll();
    s = await prisma.subscription.findUnique({ where: { id: subscription.id } });
    expect(s.retryCount).toBe(2);

    await subsService.dailyChargeAll();
    s = await prisma.subscription.findUnique({ where: { id: subscription.id } });
    expect(s.active).toBe(false);
    expect(s.suspendedAt).not.toBeNull();

    // credit wallet sufficiently
    await walletService.addCredit(user.id, 100, { test: true });

    // reactivate
    const reactivated = await subsService.reactivateSubscription(user.id);
    expect(reactivated.active).toBe(true);
    // ensure retry counters reset
    const s2 = await prisma.subscription.findUnique({ where: { id: subscription.id } });
    expect(s2.retryCount).toBe(0);
  });
});
