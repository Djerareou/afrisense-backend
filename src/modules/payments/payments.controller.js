import * as service from './payments.service.js';
import { z } from 'zod';
import { validateBody } from '../../middleware/validate.js';

const simulateSchema = z.object({ amount: z.number().positive(), metadata: z.any().optional(), transactionId: z.string().optional() });

export const simulateMobileController = [validateBody(simulateSchema), async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { amount, metadata, transactionId } = req.body;
    const p = await service.simulateMobileMoneyPayment(userId, amount, metadata || {}, transactionId || null);
    return res.json({ success: true, data: p });
  } catch (err) {
    return next(err);
  }
}];

export const simulateCardController = [validateBody(simulateSchema), async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { amount, metadata, transactionId } = req.body;
    const p = await service.simulateCardPayment(userId, amount, metadata || {}, transactionId || null);
    return res.json({ success: true, data: p });
  } catch (err) {
    return next(err);
  }
}];

export default { simulateMobileController, simulateCardController };
