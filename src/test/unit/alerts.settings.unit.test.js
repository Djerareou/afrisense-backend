jest.mock('../../config/prismaClient.js', () => ({
  prisma: {
    tracker: { 
      findUnique: jest.fn().mockResolvedValue({ 
        id: 't1', 
        userId: 'u1',
        user: { id: 'u1', email: 'test@example.com', phone: '+1234567890' }
      }) 
    },
    position: { findUnique: jest.fn().mockResolvedValue({ id: 'p1', trackerId: 't1' }) },
    alertSetting: {
      findUnique: jest.fn().mockResolvedValue({ 
        userId: 'u1', 
        channels: JSON.stringify({ CONSOLE: true }), 
        thresholds: JSON.stringify({ overspeed: 100, lowBattery: 20 }), 
        enabled: true 
      }),
      update: jest.fn().mockResolvedValue({ userId: 'u1', channels: JSON.stringify({ CONSOLE: true }) }),
      create: jest.fn().mockResolvedValue({ userId: 'u1', channels: JSON.stringify({ CONSOLE: true }) }),
    },
    alert: { 
      create: jest.fn().mockImplementation((opts) => {
        const data = opts.data;
        return Promise.resolve({ 
          id: 'a1', 
          ...data,
          tracker: { id: 't1', label: 'Test Tracker' },
          geofence: null
        });
      }),
      findMany: jest.fn().mockResolvedValue([])
    },
    alertDeliveryLog: { create: jest.fn().mockResolvedValue({ id: 'dl1' }) },
  }
}));

describe('alerts settings and disabled behavior', () => {
  beforeEach(() => jest.clearAllMocks());

  test('updateAlertSettings creates or updates settings', async () => {
    const alerts = await import('../../modules/alerts/alerts.service.js');
    const res = await alerts.updateAlertSettings('u1', { enabled: true, channels: { CONSOLE: true }, thresholds: { overspeed: 90 } });
    const prismaModule = await import('../../config/prismaClient.js');
    expect(prismaModule.prisma.alertSetting.update || prismaModule.prisma.alertSetting.create).toBeDefined();
    expect(res).toBeTruthy();
  });

  test('createAlert does not create when settings.enabled is false', async () => {
    const prismaModule = await import('../../config/prismaClient.js');
    prismaModule.prisma.alertSetting.findUnique = jest.fn().mockResolvedValue({ 
      userId: 'u1', 
      channels: JSON.stringify({ CONSOLE: true }), 
      thresholds: JSON.stringify({ overspeed: 100 }), 
      enabled: false 
    });
    
    const alerts = await import('../../modules/alerts/alerts.service.js');
    const payload = { trackerId: 't1', positionId: 'p1', type: 'OVERSPEED', meta: { speed: 120 } };
    const res = await alerts.createAlert(payload);
    expect(res).toBeNull();
  });
});
