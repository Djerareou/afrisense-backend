const mockTracker = {
  id: 't1',
  imei: '123456789012345',
  protocol: 'GT06',
  label: 'Tracker 123',
  status: 'inactive',
};

// Mock the model and utils before importing service
jest.mock('../../modules/trackers/trackers.model.js', () => ({
  createTracker: jest.fn().mockResolvedValue(mockTracker),
  getTrackerById: jest.fn().mockResolvedValue(mockTracker),
  getTrackerByIMEI: jest.fn().mockResolvedValue(null),
  listTrackers: jest.fn().mockResolvedValue([mockTracker]),
  updateTracker: jest.fn().mockResolvedValue(Object.assign({}, mockTracker, { label: 'updated' })),
  deleteTracker: jest.fn().mockResolvedValue(mockTracker),
}));

jest.mock('../../modules/trackers/trackers.utils.js', () => ({
  sanitizeIMEI: (imei) => String(imei).replace(/[^0-9]/g, ''),
  normalizeProtocol: (p) => (p ? String(p).toUpperCase() : 'GT06'),
  defaultStatus: () => 'inactive',
}));

describe('trackers.service (unit)', () => {
  test('registerTracker creates a tracker', async () => {
  const { registerTracker } = await import('../../modules/trackers/trackers.service.js');
    const res = await registerTracker({ imei: '123-456-789', protocol: 'gt06' });
    expect(res).toHaveProperty('imei');
    expect(res.imei).toContain('123456789');
  });

  test('getAllTrackers returns list', async () => {
  const { getAllTrackers } = await import('../../modules/trackers/trackers.service.js');
    const list = await getAllTrackers();
    expect(Array.isArray(list)).toBe(true);
    expect(list[0]).toHaveProperty('id');
  });

  test('getTracker returns tracker', async () => {
  const { getTracker } = await import('../../modules/trackers/trackers.service.js');
    const t = await getTracker('t1');
    expect(t).toHaveProperty('id', 't1');
  });

  test('modifyTracker updates tracker', async () => {
  const { modifyTracker } = await import('../../modules/trackers/trackers.service.js');
    const t = await modifyTracker('t1', { label: 'updated' });
    expect(t).toHaveProperty('label', 'updated');
  });

  test('removeTracker deletes tracker', async () => {
  const { removeTracker } = await import('../../modules/trackers/trackers.service.js');
    const res = await removeTracker('t1');
    expect(res).toHaveProperty('id', 't1');
  });
});
