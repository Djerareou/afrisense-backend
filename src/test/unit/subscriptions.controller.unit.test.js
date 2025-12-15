jest.mock('../../modules/subscriptions/subscriptions.service.js', () => ({
  changeUserPlan: jest.fn()
}));

import { changeUserPlan as mockChange } from '../../modules/subscriptions/subscriptions.service.js';
import { changePlanController } from '../../modules/subscriptions/subscriptions.controller.js';

beforeEach(() => jest.clearAllMocks());

test('changePlanController returns success when service resolves', async () => {
  mockChange.mockResolvedValue({ id: 's1', planId: 'p1' });
  const req = { user: { userId: 'u1' }, body: { planKey: 'starter' } };
  const json = jest.fn();
  const res = { json, status: jest.fn().mockReturnValue({ json }) };

  // handler is the second element (after validateBody middleware)
  await changePlanController[1](req, res);

  expect(json).toHaveBeenCalledWith({ success: true, data: { id: 's1', planId: 'p1' } });
});

test('changePlanController returns 400 when service throws', async () => {
  mockChange.mockRejectedValue(new Error('Plan not found'));
  const req = { user: { userId: 'u1' }, body: { planKey: 'invalid' } };
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { json, status };

  await changePlanController[1](req, res);

  expect(status).toHaveBeenCalledWith(400);
  expect(json).toHaveBeenCalledWith({ success: false, error: 'Plan not found' });
});
