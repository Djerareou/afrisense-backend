// src/modules/payments/payment.service.js
import * as repo from './payments.repository.js';
import * as walletService from '../wallet/wallet.service.js';

/**
 * simulateMobileMoneyPayment: creates a PaymentRecord (pending->success) and credits wallet
 */
export async function simulateMobileMoneyPayment(userId, amount, metadata = {}) {
  if (amount <= 0) throw new Error('Amount must be positive');
  const payment = await repo.createPaymentRecord({
    userId,
    amount,
    method: 'simulated_mobile_money',
    status: 'pending',
    metadata,
  });
  // simulate success by updating the existing payment record
  const updatedPayment = await repo.updatePaymentRecord(payment.id, {
    status: 'success',
    providerRef: null,
  });

  // credit wallet
  await walletService.addCredit(userId, amount, { provider: 'simulated_mobile_money', paymentId: updatedPayment.id });

  return updatedPayment;
}

/**
 * simulateCardPayment (same idea)
 */
export async function simulateCardPayment(userId, amount, metadata = {}) {
  return simulateMobileMoneyPayment(userId, amount, { ...metadata, via: 'card' });
}
