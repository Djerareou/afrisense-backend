// src/modules/subscriptions/subscription.repository.js
import { prisma } from '../../config/prismaClient.js';

export async function findSubscriptionByUser(userId) {
  return prisma.subscription.findFirst({ where: { userId } });
}

export async function createSubscription(userId, planId, startDate = new Date()) {
  return prisma.subscription.create({
    data: { userId, planId, active: true, startDate },
  });
}

export async function updateSubscription(userId, data) {
  return prisma.subscription.update({ where: { userId }, data });
}

export async function listPlans() {
  return prisma.plan.findMany({ orderBy: { pricePerDay: 'asc' } });
}

export async function findPlanByKey(key) {
  return prisma.plan.findUnique({ where: { key } });
}

export async function findPlanById(id) {
  return prisma.plan.findUnique({ where: { id } });
}
