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
      }) 
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

describe('alerts.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createAlert requires trackerId', async () => {
    const alerts = await import('../../modules/alerts/alerts.service.js');
    const payload = { positionId: 'p1', type: 'OVERSPEED', meta: { speed: 120 } };
    await expect(alerts.createAlert(payload)).rejects.toThrow('trackerId is required');
  });

  test('createAlert requires positionId', async () => {
    const alerts = await import('../../modules/alerts/alerts.service.js');
    const payload = { trackerId: 't1', type: 'OVERSPEED', meta: { speed: 120 } };
    await expect(alerts.createAlert(payload)).rejects.toThrow('positionId is required');
  });

  test('createAlert persists alert and logs deliveries', async () => {
    const alerts = await import('../../modules/alerts/alerts.service.js');
    const payload = { 
      trackerId: 't1', 
      positionId: 'p1', 
      type: 'OVERSPEED', 
      meta: { speed: 120 } 
    };
    
    const res = await alerts.createAlert(payload);
    expect(res).toHaveProperty('id', 'a1');
    expect(res).toHaveProperty('trackerId', 't1');
    expect(res).toHaveProperty('positionId', 'p1');
    
    const prismaModule = await import('../../config/prismaClient.js');
    expect(prismaModule.prisma.tracker.findUnique).toHaveBeenCalledWith({ where: { id: 't1' } });
    expect(prismaModule.prisma.position.findUnique).toHaveBeenCalledWith({ where: { id: 'p1' } });
    expect(prismaModule.prisma.alert.create).toHaveBeenCalled();
    
    // Wait a bit for async notification dispatch
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  test('createAlert skips duplicate within 2 minutes', async () => {
    const alerts = await import('../../modules/alerts/alerts.service.js');
    const prismaModule = await import('../../config/prismaClient.js');
    
    // Mock finding a recent similar alert
    prismaModule.prisma.alert.findMany.mockResolvedValueOnce([
      { id: 'a0', trackerId: 't1', type: 'OVERSPEED', timestamp: new Date() }
    ]);
    
    const payload = { 
      trackerId: 't1', 
      positionId: 'p1', 
      type: 'OVERSPEED', 
      meta: { speed: 120 } 
    };
    
    const res = await alerts.createAlert(payload);
    expect(res).toBeNull();
    // Verify that alert.create was NOT called when duplicate detected
    expect(prismaModule.prisma.alert.create).not.toHaveBeenCalled();
  });
});
