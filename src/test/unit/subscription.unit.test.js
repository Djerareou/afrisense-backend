// src/test/unit/subscription.unit.test.js
import * as subRepo from '../../modules/subscriptions/subscriptions.repository.js';
import * as subService from '../../modules/subscriptions/subscriptions.service.js';
jest.mock('../../modules/subscriptions/subscriptions.repository.js');
jest.mock('../../modules/wallet/wallet.service.js');

test('subscribeUser creates subscription', async () => {
  subRepo.findPlanByKey.mockResolvedValue({ id: 'p1', key: 'starter', pricePerDay: 200 });
  subRepo.findSubscriptionByUser.mockResolvedValue(null);
  subRepo.createSubscription.mockResolvedValue({ id: 's1', userId: 'u1', planId: 'p1' });

  const res = await subService.subscribeUser('u1', 'starter');
  expect(res).toHaveProperty('id', 's1');
});
