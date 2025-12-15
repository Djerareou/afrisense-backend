import crypto from 'crypto';
import * as paymentsRepo from '../../modules/payments/payments.repository.js';
import * as walletService from '../../modules/wallet/wallet.service.js';
import { prisma } from '../../config/prismaClient.js';
import fwClient from './flutterwave.client.js';

const WEBHOOK_SECRET = process.env.FLUTTERWAVE_WEBHOOK_SECRET || 'test-webhook-secret';

function generateIdempotencyKey() {
  return `fw:${Date.now()}:${Math.random().toString(36).slice(2, 9)}`;
}

export async function initPayment(userId, amount, metadata = {}, idempotencyKey = null, currency = null) {
  if (amount <= 0) throw new Error('Amount must be positive');
  const idemp = idempotencyKey || generateIdempotencyKey();
  const meta = { ...(metadata || {}), tx_ref: idemp };

  // If a successful payment with this idempotency key exists, reconcile and return it
  const existingSuccess = await paymentsRepo.findSuccessfulByIdempotencyKey(idemp);
  if (existingSuccess) {
    // if success exists but has no userId, attach it and credit wallet
    if (!existingSuccess.userId && userId) {
      await paymentsRepo.updatePaymentRecord(existingSuccess.id, { userId });
      await walletService.addCredit(userId, existingSuccess.amount, { provider: 'flutterwave', paymentId: existingSuccess.id });
    }
    return { payment: existingSuccess, idempotencyKey: idemp, reconciled: true };
  }

  // create pending payment (idempotency key) unless one already exists
  let payment = await paymentsRepo.findPaymentByIdempotencyKey(idemp);
  if (!payment) {
    payment = await paymentsRepo.createPaymentRecord({
      userId,
      amount,
      currency: currency || undefined,
      method: 'flutterwave',
      status: 'pending',
      metadata: meta,
      idempotencyKey: idemp,
    });
  } else {
    // if payment exists but has no userId, attach userId
    if (!payment.userId && userId) {
      await paymentsRepo.updatePaymentRecord(payment.id, { userId });
    }
  }

  // In a real impl we'd call Flutterwave init endpoint and return host/payment link
  // If real Flutterwave is configured, create a payment on Flutterwave and return link
  if (process.env.FLUTTERWAVE_SECRET_KEY) {
    try {
      const payload = {
        tx_ref: idemp,
        amount: String(payment.amount),
        currency: currency || payment.currency || 'XAF',
        redirect_url: process.env.FLUTTERWAVE_RETURN_URL || null,
        customer: { email: (await prisma.user.findUnique({ where: { id: userId } }))?.email },
        meta: metadata || {},
      };
  // Use the client init method (createPaymentInit) which returns the payment link/authorization
  const resp = await fwClient.createPaymentInit({ amount: String(payment.amount), currency: payload.currency, tx_ref: idemp, redirect_url: payload.redirect_url, customer: payload.customer });
      // Flutterwave returns a meta and data with authorization url; adapt as needed
      const link = resp?.data?.link || resp?.data?.authorization?.url || null;
      return { payment, idempotencyKey: idemp, link, fwResponse: resp };
    } catch (e) {
      // fallback: return created payment record
      return { payment, idempotencyKey: idemp };
    }
  }

  return { payment, idempotencyKey: idemp };
}

function computeSignature(body, rawBody = null) {
  // Use rawBody when available (exact bytes received) to match provider signature computation.
  const data = typeof rawBody === 'string' ? rawBody : (typeof body === 'string' ? body : JSON.stringify(body));
  return crypto.createHmac('sha256', WEBHOOK_SECRET).update(data).digest('hex');
}

/**
 * Handle a received webhook from Flutterwave (minimal, idempotent)
 * headers: object with signature header 'verif-hash'
 * body: parsed JSON body
 */
export async function handleWebhook(headers, body, rawBody = null) {
  const signature = headers['verif-hash'] || headers['verif_hash'] || headers['x-flw-signature'];
  const expected = computeSignature(body, rawBody);
  if (!signature || signature !== expected) {
    const err = new Error('Invalid webhook signature');
    err.status = 401;
    throw err;
  }

  // Try to extract tx_ref (our idempotency key) and transaction id
  const data = body?.data || body;
  const txRef = data?.tx_ref || data?.tx_ref || (data?.meta && data.meta.tx_ref) || (data?.payload && data.payload.tx_ref);
  const providerTxId = data?.id || data?.transaction_id || data?.txid;
  const amount = parseFloat(data?.amount || data?.charged_amount || data?.transaction_amount || 0);

  if (!txRef) {
    // No idempotency key - can't safely process
    const err = new Error('Missing tx_ref');
    err.status = 400;
    throw err;
  }

  // If a successful payment with this idempotency key already exists, do nothing
  const existingSuccess = await paymentsRepo.findSuccessfulByIdempotencyKey(txRef);
  if (existingSuccess) return { ok: true, reason: 'already_processed' };

  // Find pending payment
  let payment = await paymentsRepo.findPaymentByIdempotencyKey(txRef);
  if (!payment) {
    // attempt to resolve user from webhook payload (customer email/phone)
    let resolvedUserId = null;
    try {
      const email = data?.customer?.email || data?.meta?.customer?.email || data?.meta?.customer_email || data?.customer_email;
      const phone = data?.customer?.phone || data?.meta?.customer?.phone;
      if (email) {
        const u = await prisma.user.findFirst({ where: { email } });
        if (u) resolvedUserId = u.id;
      }
      if (!resolvedUserId && phone) {
        const u2 = await prisma.user.findFirst({ where: { phone: phone } });
        if (u2) resolvedUserId = u2.id;
      }
    } catch (e) {}

    // create a new payment record if none exists and if we can resolve a userId
    const createData = {
      userId: resolvedUserId || undefined,
      amount: amount || 0,
      method: 'flutterwave',
      status: 'pending',
      metadata: { originalWebhook: data },
      idempotencyKey: txRef,
    };
    // if userId is undefined, omit the field (required by Prisma). We'll create without user relation by setting metadata only and storing providerRefs elsewhere.
    if (!createData.userId) {
      // Can't create PaymentRecord without userId per schema; create a minimal audit entry in AuditTrail instead and return
      // For now, return early and record the webhook in metadata of an AuditTrail
      await prisma.auditTrail.create({ data: { action: 'flutterwave_webhook_unmatched', targetModel: 'PaymentRecord', beforeData: null, afterData: JSON.stringify(data) } });
      return { ok: true, reason: 'no_user_matched' };
    }

    payment = await paymentsRepo.createPaymentRecord(createData);
  }

  // Consider statuses that denote success
  const status = (data?.status || '').toLowerCase();
  const isSuccess = status === 'successful' || status === 'success' || status === 'completed' || status === 'ok';

  if (isSuccess) {
    // Double-check again before crediting
    const check = await paymentsRepo.findSuccessfulByIdempotencyKey(txRef);
    if (check) return { ok: true, reason: 'already_processed' };

    // Update payment record
    const updated = await paymentsRepo.updatePaymentRecord(payment.id, { status: 'success', providerRef: providerTxId, metadata: { ...(payment.metadata || {}), webhook: data } });

    // If userId is present on payment record, credit wallet
    if (updated.userId) {
      await walletService.addCredit(updated.userId, updated.amount, { provider: 'flutterwave', paymentId: updated.id });
    }

    return { ok: true, updated };
  }

  // non-success statuses -> update record to failure
  await paymentsRepo.updatePaymentRecord(payment.id, { status: 'failure', providerRef: providerTxId, metadata: { ...(payment.metadata || {}), webhook: data } });
  return { ok: true, reason: 'non_success' };
}

// Export computeSignature for tests
export const _computeSignature = computeSignature;

/**
 * Verify transaction on Flutterwave by tx_ref and reconcile locally if successful.
 * Returns { found: boolean, remote, reconciled: boolean, payment }
 */
export async function verifyAndReconcile(txRef) {
  if (!txRef) throw new Error('tx_ref required');
  const BASE = process.env.FLUTTERWAVE_BASE_URL || 'https://api.flutterwave.com/v3';
  const SECRET = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!SECRET) return { found: false, reason: 'no_secret_configured' };

  // dynamic fetch helper
  async function _fetch(...args) {
    if (typeof globalThis.fetch === 'function') return globalThis.fetch(...args);
    const nf = await import('node-fetch');
    return nf.default(...args);
  }

  const url = `${BASE}/transactions?tx_ref=${encodeURIComponent(txRef)}`;
  const res = await _fetch(url, { headers: { Authorization: `Bearer ${SECRET}` } });
  const json = await res.json();
  if (!json || json.status !== 'success' || !Array.isArray(json.data) || json.data.length === 0) {
    return { found: false, remote: json };
  }

  // choose the most recent successful transaction if any, otherwise the first entry
  let tx = null;
  for (const item of json.data) {
    if ((item.status || '').toLowerCase() === 'successful') { tx = item; break; }
  }
  if (!tx) tx = json.data[0];

  // now reconcile locally
  const txStatus = (tx.status || '').toLowerCase();
  const paymentsRepo = await import('../../modules/payments/payments.repository.js');
  const walletService = await import('../../modules/wallet/wallet.service.js');
  const { prisma } = await import('../../config/prismaClient.js');

  const okStatuses = ['successful','success','completed','ok'];
  const isSuccess = okStatuses.includes(txStatus);

  // find existing payment record
  let payment = await paymentsRepo.findPaymentByIdempotencyKey(txRef);

  if (!payment) {
    // try resolve user
    let resolvedUserId = null;
    try {
      const email = tx.customer?.email || tx.customer_email || (tx.meta && tx.meta.customer_email);
      const phone = tx.customer?.phone || tx.customer_phone;
      if (email) {
        const u = await prisma.user.findFirst({ where: { email } });
        if (u) resolvedUserId = u.id;
      }
      if (!resolvedUserId && phone) {
        const u2 = await prisma.user.findFirst({ where: { phone } });
        if (u2) resolvedUserId = u2.id;
      }
    } catch (e) {}

    if (resolvedUserId) {
      payment = await paymentsRepo.createPaymentRecord({
        userId: resolvedUserId,
        amount: parseFloat(tx.amount || tx.charged_amount || 0) || 0,
        currency: tx.currency || 'NGN',
        method: 'flutterwave',
        status: 'pending',
        metadata: { originalFW: tx },
        idempotencyKey: txRef,
      });
    } else {
      // can't reconcile without user
      return { found: true, remote: tx, reconciled: false, reason: 'no_user_matched' };
    }
  }

  // if already successful do nothing
  const existingSuccess = await paymentsRepo.findSuccessfulByIdempotencyKey(txRef);
  if (existingSuccess) return { found: true, remote: tx, reconciled: true, payment: existingSuccess };

  if (isSuccess) {
    const providerRef = tx.id ? String(tx.id) : (tx.flw_ref || null);
    const updated = await paymentsRepo.updatePaymentRecord(payment.id, { status: 'success', providerRef, metadata: { ...(payment.metadata||{}), webhookRecon: tx } });
    if (updated.userId) {
      await walletService.addCredit(updated.userId, updated.amount, { provider: 'flutterwave', paymentId: updated.id });
    }
    return { found: true, remote: tx, reconciled: true, payment: updated };
  }

  // mark failure
  await paymentsRepo.updatePaymentRecord(payment.id, { status: 'failure', providerRef: tx.id ? String(tx.id) : (tx.flw_ref || null), metadata: { ...(payment.metadata||{}), webhookRecon: tx } });
  return { found: true, remote: tx, reconciled: false, payment };
}
