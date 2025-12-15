import { on } from '../index.js';
import * as notifications from '../../notifications/index.js';

// Templates (fr)
function t_rechargeReceived(amount) {
  return `Votre recharge de ${amount} FCFA a été reçue. Merci !`;
}

function t_insufficient(amount, costPerDay) {
  return `Recharge insuffisante : votre plan coûte ${costPerDay} FCFA/jour. Solde actuel ${amount} FCFA.`;
}

function t_subscriptionSuspended() {
  return `Votre abonnement a été suspendu pour insuffisance de fonds.`;
}

function t_trialReminder(daysLeft) { return `Votre période d'essai se termine dans ${daysLeft} jours.`; }

// Subscribe to events
on('WALLET_TOPUP', async ({ userId, wallet, amount }) => {
  // send a simple notification (real implementation would look up user contact)
  await notifications.sendNotification({ to: userId, subject: 'Recharge reçue', body: t_rechargeReceived(amount), channel: 'sms' });
});

on('DEBIT_FAILED', async ({ userId, wallet, amount }) => {
  await notifications.sendNotification({ to: userId, subject: 'Recharge insuffisante', body: t_insufficient(wallet?.balance ?? 0, 'votre plan'), channel: 'sms' });
});

on('SUBSCRIPTION_SUSPENDED', async ({ userId }) => {
  await notifications.sendNotification({ to: userId, subject: 'Abonnement suspendu', body: t_subscriptionSuspended(), channel: 'sms' });
});

on('PAYMENT_SUCCESS', async ({ userId, payment }) => {
  await notifications.sendNotification({ to: userId, subject: 'Paiement réussi', body: t_rechargeReceived(payment.amount), channel: 'sms' });
});

export default {};
