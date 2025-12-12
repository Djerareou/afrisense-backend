// src/modules/payments/payment.service.js
import * as repo from './payments.repository.js';
import * as walletService from '../wallet/wallet.service.js';
import { emit } from '../../core/events/index.js';

/**
 * Build an idempotency key from transactionId or externalRef in metadata
 */
function buildIdempotencyKey(transactionId, metadata = {}) {
  if (transactionId) return String(transactionId);
  if (metadata && (metadata.externalRef || metadata.external_ref)) return String(metadata.externalRef || metadata.external_ref);
  return null;
}

/**
 * simulateMobileMoneyPayment: creates a PaymentRecord (pending->success) and credits wallet
 */
export async function simulateMobileMoneyPayment(userId, amount, metadata = {}, transactionId = null) {
  if (amount <= 0) throw new Error('Amount must be positive');
  const idempKey = buildIdempotencyKey(transactionId, metadata);

  // idempotency: if a successful payment with the same key exists, return it
  if (idempKey) {
    const existingSuccess = await repo.findSuccessfulByIdempotencyKey(idempKey);
    if (existingSuccess) return existingSuccess;
  }

  // create pending payment (with idempotencyKey when available)
  const payment = await repo.createPaymentRecord({
    userId,
    amount,
    method: 'simulated_mobile_money',
    status: 'pending',
    metadata,
    idempotencyKey: idempKey,
  });

  // simulate provider processing and mark success
  const updatedPayment = await repo.updatePaymentRecord(payment.id, {
    status: 'success',
    providerRef: null,
  });

  // credit wallet
  await walletService.addCredit(userId, amount, { provider: 'simulated_mobile_money', paymentId: updatedPayment.id });

  // emit event for other systems
  emit('PAYMENT_SUCCESS', { userId, payment: updatedPayment });

  return updatedPayment;
}

/**
 * simulateCardPayment (same idea)
 */
export async function simulateCardPayment(userId, amount, metadata = {}, transactionId = null) {
  return simulateMobileMoneyPayment(userId, amount, { ...metadata, via: 'card' }, transactionId);
}
