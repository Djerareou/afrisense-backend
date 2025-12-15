import { prisma } from '../../config/prismaClient.js';
import * as paymentsService from '../../modules/payments/payments.service.js';
import * as walletService from '../../modules/wallet/wallet.service.js';

jest.setTimeout(20000);

describe('payments idempotency integration', () => {
  let user;

  beforeAll(async () => {
    const now = Date.now();
    user = await prisma.user.create({ data: { fullName: 'Idem User', email: `itest+idem_${now}@example.com`, role: 'user', passwordHash: 'x' } });
    await prisma.wallet.create({ data: { userId: user.id, balance: 0 } });
  });

  afterAll(async () => {
    await prisma.paymentRecord.deleteMany({ where: { userId: user.id } }).catch(() => {});
    const w = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (w) {
      await prisma.walletTransaction.deleteMany({ where: { walletId: w.id } }).catch(() => {});
      await prisma.wallet.delete({ where: { id: w.id } }).catch(() => {});
    }
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  });

  test('duplicate payment submissions with same transaction id should not double-credit', async () => {
    const amount = 100;
    const transactionId = `tx-${Date.now()}`;

    // first call
    const r1 = await paymentsService.simulateMobileMoneyPayment(user.id, amount, { note: 'first' }, transactionId);
    expect(r1).toBeDefined();

    // second call with same transaction id
    const r2 = await paymentsService.simulateMobileMoneyPayment(user.id, amount, { note: 'duplicate' }, transactionId);
    expect(r2).toBeDefined();

    // wallet balance should reflect only one credit
    const w = await prisma.wallet.findUnique({ where: { userId: user.id } });
    expect(w.balance).toBe(amount);
  });
});
