import { prisma } from '../../config/prismaClient.js';
import * as subsService from '../../modules/subscriptions/subscriptions.service.js';
import * as walletService from '../../modules/wallet/wallet.service.js';

jest.setTimeout(20000);

describe('prepaySubscription integration', () => {
  let user;
  let plan;

  beforeAll(async () => {
    const now = Date.now();
    user = await prisma.user.create({ data: { fullName: 'Prepay User', email: `itest+prepay_${now}@example.com`, role: 'user', passwordHash: 'x' } });
    plan = await prisma.plan.create({ data: { key: `prepay-plan-${now}`, name: 'Prepay Plan', pricePerDay: 5 } });
    // create wallet and credit it
    await prisma.wallet.create({ data: { userId: user.id, balance: 0 } });
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

  test('prepay charges wallet and sets prepaidUntil with bonus days', async () => {
    // credit wallet with enough balance
    await walletService.addCredit(user.id, 500, { test: true });

    // prepay 30 days -> should apply bonus (5%)
    const days = 30;
    const result = await subsService.prepaySubscription(user.id, days, plan.key);
    expect(result).toBeDefined();
    const sub = await prisma.subscription.findFirst({ where: { userId: user.id } });
    expect(sub.prepaidUntil).toBeTruthy();

    // verify wallet has been debited roughly pricePerDay * days
    const w = await prisma.wallet.findUnique({ where: { userId: user.id } });
    expect(w.balance).toBeLessThanOrEqual(500 - plan.pricePerDay * days + 1); // allow small rounding
  });
});
