import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prismaClient.js';
import { AuthMessages } from './messages.js';
import { auditLog } from './audit.service.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export const registerUser = async ({ fullName, email, phone, password, role, planName }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error(AuthMessages.EMAIL_ALREADY_EXISTS);

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { fullName, email, phone, passwordHash: hash, role }
  });

  // Create a subscription in TRIAL for 3 days for the chosen plan (default: STARTER)
  try {
    const chosenPlanName = planName && typeof planName === 'string' ? planName.toUpperCase() : 'STARTER';
    let plan = await prisma.plan.findUnique({ where: { name: chosenPlanName } });
    if (!plan) {
      // fallback to STARTER if chosen plan not found
      plan = await prisma.plan.findUnique({ where: { name: 'STARTER' } });
    }

    const trialEndsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now

    if (plan) {
      await prisma.subscription.create({
        data: {
          userId: user.id,
          planId: plan.id,
          status: 'TRIAL',
          trialEndsAt
        }
      });
    }
  } catch (err) {
    // don't block user registration if subscription creation fails; just log the error via audit
    await auditLog({ userId: user.id, action: 'SUBSCRIPTION_CREATE', status: 'FAILURE' });
  }

  await auditLog({ userId: user.id, action: 'REGISTER', status: 'SUCCESS' });
  return { id: user.id, fullName, email, role };
};

export const loginUser = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await auditLog({ userId: null, action: 'LOGIN', status: 'FAILURE' });
    throw new Error(AuthMessages.INVALID_CREDENTIALS);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    await auditLog({ userId: user.id, action: 'LOGIN', status: 'FAILURE' });
    throw new Error(AuthMessages.INVALID_PASSWORD);
  }

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
  await auditLog({ userId: user.id, action: 'LOGIN', status: 'SUCCESS' });

  return { token, user: { id: user.id, email: user.email, role: user.role } };
};

export const getUserProfile = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error(AuthMessages.USER_NOT_FOUND);
  return { id: user.id, fullName: user.fullName, email: user.email, role: user.role };
};
