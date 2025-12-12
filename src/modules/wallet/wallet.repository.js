// src/modules/wallet/wallet.repository.js
import { prisma } from '../../config/prismaClient.js';

export async function findWalletByUserId(userId) {
  return prisma.wallet.findUnique({ where: { userId } });
}

export async function createWallet(userId) {
  // Use upsert-like create to avoid race conditions; caller should handle uniqueness/errors
  return prisma.wallet.create({ data: { userId, balance: 0 } });
}

export async function updateWalletBalance(walletId, delta, tx = undefined) {
  // delta can be positive (credit) or negative (debit)
  // use prisma transaction if provided
  return prisma.wallet.update({
    where: { id: walletId },
    data: { balance: { increment: delta }, updatedAt: new Date() },
  });
}

export async function createWalletTransaction(walletId, type, amount, metadata = null) {
  return prisma.walletTransaction.create({
    data: {
      walletId,
      type,
      amount,
      metadata,
    },
  });
}

export async function ensureWalletForUser(userId) {
  // Use upsert to avoid races: if wallet exists return it, otherwise create it.
  const existing = await findWalletByUserId(userId);
  if (existing) return existing;
  try {
    const created = await prisma.wallet.create({ data: { userId, balance: 0 } });
    return created;
  } catch (err) {
    // possible race if another process created it concurrently
    return await findWalletByUserId(userId);
  }
}

export async function debitIfSufficient(walletId, amount) {
  // atomic check-and-decrement in a transaction to avoid negative balances
  return prisma.$transaction(async (tx) => {
    const w = await tx.wallet.findUnique({ where: { id: walletId } });
    if (!w) throw new Error('Wallet not found');
    if (w.frozen) throw new Error('Wallet is frozen');
    if (w.balance < amount) throw new Error('Insufficient balance');
    const updated = await tx.wallet.update({ where: { id: walletId }, data: { balance: { decrement: amount } } });
    await tx.walletTransaction.create({ data: { walletId, type: 'DEBIT', amount: -Math.abs(amount), metadata: null } });
    return updated;
  });
}

export async function creditWithTransaction(walletId, amount, metadata = null) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.wallet.update({ where: { id: walletId }, data: { balance: { increment: amount } } });
    await tx.walletTransaction.create({ data: { walletId, type: 'TOPUP', amount, metadata } });
    return updated;
  });
}

export async function incrementLoyaltyPoints(walletId, points) {
  return prisma.wallet.update({ where: { id: walletId }, data: { loyaltyPoints: { increment: points } } });
}
