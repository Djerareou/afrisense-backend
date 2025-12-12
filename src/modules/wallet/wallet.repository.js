// src/modules/wallet/wallet.repository.js
import { prisma } from '../../config/prismaClient.js';

export async function findWalletByUserId(userId) {
  return prisma.wallet.findUnique({ where: { userId } });
}

export async function createWallet(userId) {
  return prisma.wallet.create({
    data: { userId, balance: 0 },
  });
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
  let w = await findWalletByUserId(userId);
  if (!w) w = await createWallet(userId);
  return w;
}
