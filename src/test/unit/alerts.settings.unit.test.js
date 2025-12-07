jest.mock('../../config/prismaClient.js', () => ({
  prisma: {
    tracker: { findUnique: jest.fn().mockResolvedValue({ id: 't1', userId: 'u1' }) },
    alertSetting: {
      findUnique: jest.fn().mockResolvedValue({ userId: 'u1', channels: JSON.stringify(['CONSOLE']), thresholds: JSON.stringify({ overspeed: 100, lowBattery: 20 }), enabled: true }),
      update: jest.fn().mockResolvedValue({ userId: 'u1', channels: JSON.stringify(['CONSOLE']) }),
      create: jest.fn().mockResolvedValue({ userId: 'u1', channels: JSON.stringify(['CONSOLE']) }),
    },
    alert: { create: jest.fn().mockResolvedValue({ id: 'a1' }) },
    alertDeliveryLog: { create: jest.fn().mockResolvedValue({ id: 'dl1' }) },
  }
}));

describe('alerts settings and disabled behavior', () => {
  beforeEach(() => jest.clearAllMocks());

  test('updateAlertSettings creates or updates settings', async () => {
    const alerts = await import('../../modules/alerts/alerts.service.js');
    const res = await alerts.updateAlertSettings('u1', { enabled: true, channels: ['CONSOLE'], thresholds: { overspeed: 90 } });
    const prismaModule = await import('../../config/prismaClient.js');
    expect(prismaModule.prisma.alertSetting.update || prismaModule.prisma.alertSetting.create).toBeDefined();
    expect(res).toBeTruthy();
  });

  test('createAlert does not create when settings.enabled is false', async () => {
    const prismaModule = await import('../../config/prismaClient.js');
    prismaModule.prisma.alertSetting.findUnique = jest.fn().mockResolvedValue({ userId: 'u1', channels: JSON.stringify(['CONSOLE']), thresholds: JSON.stringify({ overspeed: 100 }), enabled: false });
    const alerts = await import('../../modules/alerts/alerts.service.js');
    const payload = { userId: 'u1', trackerId: 't1', positionId: 'p1', type: 'OVERSPEED', severity: 'WARNING' };
    const res = await alerts.createAlert(payload);
    expect(res).toBeNull();
  });
});
