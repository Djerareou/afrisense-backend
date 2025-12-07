describe('positions.schema validation', () => {
  test('accepts valid payload', async () => {
    const { positionSchema } = await import('../../modules/positions/positions.schema.js');
    const payload = { trackerImei: '123456789012345', latitude: 10, longitude: 10, timestamp: new Date().toISOString() };
    const parsed = positionSchema.parse(payload);
    expect(parsed).toHaveProperty('latitude', 10);
  });

  test('rejects invalid lat/lon', async () => {
    const { positionSchema } = await import('../../modules/positions/positions.schema.js');
    const payload = { trackerImei: '123456', latitude: 300, longitude: 10, timestamp: new Date().toISOString() };
    expect(() => positionSchema.parse(payload)).toThrow();
  });
});
