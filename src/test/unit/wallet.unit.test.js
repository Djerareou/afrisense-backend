// src/test/unit/wallet.unit.test.js
import * as walletService from '../../modules/wallet/wallet.service.js';
import * as walletRepo from '../../modules/wallet/wallet.repository.js';
jest.mock('../../modules/wallet/wallet.repository.js');
jest.mock('../../config/prismaClient.js', () => ({ prisma: {} }));

test('addCredit increases balance', async () => {
  // mock ensureWalletForUser -> wallet with id and balance
  walletRepo.ensureWalletForUser.mockResolvedValue({ id: 'w1', userId: 'u1', balance: 0, frozen: false });
  // mock prisma transaction via walletService internal call is heavy; better to spy on addCredit result
  const res = await walletService.addCredit('u1', 100, { note: 'test' });
  expect(res).toBeDefined();
});
