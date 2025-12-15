// src/modules/subscriptions/subscription.repository.js
import { prisma } from '../../config/prismaClient.js';

export async function findSubscriptionByUser(userId) {
  return prisma.subscription.findFirst({ where: { userId } });
}

export async function createSubscription(userId, planId, startDate = new Date(), trialEndsAt = null) {
  const data = { userId, planId, active: true, startDate };
  if (trialEndsAt) data.trialEndsAt = trialEndsAt;
  return prisma.subscription.create({ data });
}

export async function updateSubscription(userId, data) {
  // Prisma requires a unique identifier for update; resolve the subscription first
  const sub = await prisma.subscription.findFirst({ where: { userId } });
  if (!sub) return null;
  return prisma.subscription.update({ where: { id: sub.id }, data });
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
