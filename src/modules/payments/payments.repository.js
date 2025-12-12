// src/modules/payments/payment.repository.js
import { prisma } from '../../config/prismaClient.js';

export async function createPaymentRecord(data) {
  return prisma.paymentRecord.create({ data });
}

export async function findPaymentsByUser(userId, options = {}) {
  return prisma.paymentRecord.findMany({ where: { userId }, ...options });
}

export async function updatePaymentRecord(id, data) {
  return prisma.paymentRecord.update({ where: { id }, data });
}
