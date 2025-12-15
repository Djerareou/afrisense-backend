import { prisma } from '../../config/prismaClient.js';
import * as fw from '../../providers/flutterwave/flutterwave.service.js';

jest.setTimeout(20000);

describe('Flutterwave idempotency integration', () => {
  let user;

  beforeAll(async () => {
    const now = Date.now();
    user = await prisma.user.create({ data: { fullName: 'FW User', email: `itest+fw_${now}@example.com`, role: 'user', passwordHash: 'x' } });
    await prisma.wallet.create({ data: { userId: user.id, balance: 0 } });
    process.env.FLUTTERWAVE_WEBHOOK_SECRET = process.env.FLUTTERWAVE_WEBHOOK_SECRET || 'test-webhook-secret';
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

  test('webhook duplicate should not double-credit wallet', async () => {
    const amount = 500;
    // init a payment
    const { payment, idempotencyKey } = await fw.initPayment(user.id, amount, { note: 'itest' });

    // craft webhook body similar to Flutterwave
    const body = { data: { id: `tx-${Date.now()}`, amount, status: 'successful', tx_ref: idempotencyKey } };
    const sig = fw._computeSignature(body);
    const headers = { 'verif-hash': sig };

    // first webhook
    const r1 = await fw.handleWebhook(headers, body);
    expect(r1.ok).toBeTruthy();

    // second duplicate webhook
    const r2 = await fw.handleWebhook(headers, body);
    expect(r2.ok).toBeTruthy();
    expect(r2.reason).toBe('already_processed');

    // wallet balance should reflect a single credit
    const w = await prisma.wallet.findUnique({ where: { userId: user.id } });
    expect(w.balance).toBe(amount);
  });
});
