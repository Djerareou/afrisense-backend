describe('trackers.schema validation', () => {
  test('createTrackerSchema accepts valid payload', async () => {
  const { createTrackerSchema } = await import('../../modules/trackers/trackers.schema.js');
    const payload = { imei: '12345678901', protocol: 'gt06', label: 'T1' };
    const parsed = createTrackerSchema.parse(payload);
    expect(parsed).toHaveProperty('imei', '12345678901');
    expect(parsed).toHaveProperty('protocol');
  });

  test('createTrackerSchema rejects short imei', async () => {
  const { createTrackerSchema } = await import('../../modules/trackers/trackers.schema.js');
    const payload = { imei: '123', protocol: 'gt06' };
    expect(() => createTrackerSchema.parse(payload)).toThrow();
  });

  test('createTrackerSchema rejects invalid vehicleId UUID', async () => {
  const { createTrackerSchema } = await import('../../modules/trackers/trackers.schema.js');
    const payload = { imei: '12345678901', vehicleId: 'not-a-uuid' };
    expect(() => createTrackerSchema.parse(payload)).toThrow();
  });
});
