jest.mock('../../config/prismaClient.js', () => ({
  prisma: {
    tracker: { findUnique: jest.fn().mockResolvedValue({ id: 't1', userId: 'u1' }) },
    alertSetting: { findUnique: jest.fn().mockResolvedValue({ userId: 'u1', channels: JSON.stringify(['CONSOLE']), thresholds: JSON.stringify({ overspeed: 100, lowBattery: 20 }), enabled: true }) },
    alert: { create: jest.fn().mockImplementation((p) => Promise.resolve({ id: 'a1', ...p })) },
    alertDeliveryLog: { create: jest.fn().mockResolvedValue({ id: 'dl1' }) },
  }
}));

describe('alerts.service', () => {
  test('createAlert persists alert and logs deliveries', async () => {
    const alerts = await import('../../modules/alerts/alerts.service.js');
    const payload = { userId: 'u1', trackerId: 't1', positionId: 'p1', type: 'OVERSPEED', severity: 'WARNING', metadata: { speed: 120 } };
    const res = await alerts.createAlert(payload);
    expect(res).toHaveProperty('id', 'a1');
    const prismaModule = await import('../../config/prismaClient.js');
    expect(prismaModule.prisma.alert.create).toHaveBeenCalled();
    expect(prismaModule.prisma.alertDeliveryLog.create).toHaveBeenCalled();
  });
});
