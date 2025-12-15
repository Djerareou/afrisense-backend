import { prisma } from '../../config/prismaClient.js';
import * as fw from '../../providers/flutterwave/flutterwave.service.js';
import * as subsService from '../../modules/subscriptions/subscriptions.service.js';

jest.setTimeout(30000);

describe('Flutterwave webhook behaviors', () => {
  let user;
  let plan;

  beforeAll(async () => {
    const now = Date.now();
    user = await prisma.user.create({ data: { fullName: 'FW WO User', email: `itest+fwwo_${now}@example.com`, role: 'user', passwordHash: 'x' } });
    plan = await prisma.plan.create({ data: { key: `plan-fwwo-${now}`, name: 'Plan FW', pricePerDay: 50, freeTrialDays: 0 } });
    await prisma.wallet.create({ data: { userId: user.id, balance: 0 } });
  });

  afterAll(async () => {
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

  test('invalid signature is rejected', async () => {
    const body = { data: { id: 'tx-invalid', amount: 100, status: 'successful', tx_ref: 'nope' } };
    // craft a wrong signature
    const headers = { 'verif-hash': 'bad' };
    await expect(fw.handleWebhook(headers, body)).rejects.toThrow('Invalid webhook signature');
  });

  test('out-of-order webhook then initPayment reconciles and credits wallet', async () => {
    // create a tx_ref that will come via webhook first
    const txref = `outoforder-${Date.now()}`;
  const body = { data: { id: `tx-${Date.now()}`, amount: 200, status: 'successful', tx_ref: txref, meta: { customer: { email: user.email } } } };
    const sig = fw._computeSignature(body);
    const headers = { 'verif-hash': sig };

    // webhook arrives first (no payment record yet)
    const r1 = await fw.handleWebhook(headers, body);
    expect(r1.ok).toBeTruthy();

  // payment record should exist and wallet should be credited by webhook handling
  const p = await prisma.paymentRecord.findUnique({ where: { idempotencyKey: txref } });
  expect(p).toBeTruthy();
  const wAfter = await prisma.wallet.findUnique({ where: { userId: user.id } });
  expect(wAfter.balance).toBe(200);

  // now user calls initPayment (maybe after webhook): it should detect existing success and return it
  const init = await fw.initPayment(user.id, 200, { note: 'reconcile' }, txref);
  expect(init).toBeDefined();
  });

  test('auto-topup flow creates pending payment on DEBIT_FAILED and webhook finalizes', async () => {
    // subscribe user to plan so dailyChargeAll tries to debit
    await subsService.subscribeUser(user.id, plan.key);

  // Reset wallet to zero for auto-topup test
  await prisma.wallet.update({ where: { userId: user.id }, data: { balance: 0 } });
  let w0 = await prisma.wallet.findUnique({ where: { userId: user.id } });
  expect(w0.balance).toBe(0);

  // ensure autoTopup job listener is loaded
  await import('../../jobs/autoTopup.job.js');

  // run dailyChargeAll which will attempt to debit and fail, firing DEBIT_FAILED -> autoTopup job should call initPayment
  const res = await subsService.dailyChargeAll();
    // find a paymentRecord created with idempotencyKey starting with 'fw:'
    const pr = await prisma.paymentRecord.findFirst({ where: { idempotencyKey: { contains: 'fw:' } }, orderBy: { createdAt: 'desc' } });
    expect(pr).toBeTruthy();

    // simulate webhook success for that payment
    const body = { data: { id: `tx-${Date.now()}`, amount: pr.amount, status: 'successful', tx_ref: pr.idempotencyKey } };
    const sig = fw._computeSignature(body);
    const headers = { 'verif-hash': sig };
    const wr = await fw.handleWebhook(headers, body);
    expect(wr.ok).toBeTruthy();

    // wallet should be credited
    const w1 = await prisma.wallet.findUnique({ where: { userId: user.id } });
    expect(w1.balance).toBeGreaterThan(0);
  });
});
