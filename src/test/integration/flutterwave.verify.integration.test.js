import { prisma } from '../../config/prismaClient.js';
import * as fw from '../../providers/flutterwave/flutterwave.service.js';

jest.setTimeout(20000);

describe('Flutterwave verifyAndReconcile', () => {
  let user;

  beforeAll(async () => {
    const now = Date.now();
    user = await prisma.user.create({ data: { fullName: 'FW Verify User', email: `itest+fwverify_${now}@example.com`, role: 'user', passwordHash: 'x' } });
    await prisma.wallet.create({ data: { userId: user.id, balance: 0 } });
    process.env.FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY || 'test-secret';
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

  test('reconciles a pending payment when remote shows success and credits wallet', async () => {
    const txref = `verify-${Date.now()}`;
    // create a pending payment record in DB
    const pr = await prisma.paymentRecord.create({ data: { userId: user.id, amount: 250, method: 'flutterwave', status: 'pending', idempotencyKey: txref } });

    // mock global fetch used inside verifyAndReconcile
    const fakeTx = { id: 12345, status: 'successful', amount: 250, currency: 'NGN', customer: { email: user.email } };
    const fakeResp = { status: 'success', data: [ fakeTx ] };

    global.fetch = jest.fn().mockResolvedValue({ json: async () => fakeResp });

    const res = await fw.verifyAndReconcile(txref);
    expect(res).toBeDefined();
    expect(res.found).toBe(true);
    expect(res.reconciled).toBe(true);
    expect(res.remote).toBeTruthy();

    // payment record should be marked success and providerRef set
    const updated = await prisma.paymentRecord.findUnique({ where: { id: pr.id } });
    expect(updated.status).toBe('success');
    expect(String(updated.providerRef)).toBe(String(fakeTx.id));

    // wallet should be credited
    const w = await prisma.wallet.findUnique({ where: { userId: user.id } });
    expect(w.balance).toBe(250);

    // cleanup mock
    global.fetch = undefined;
  });
});
