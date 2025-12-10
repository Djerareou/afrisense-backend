import overspeed from '../../../engine/alerts/overspeed.rule.js';

describe('overspeed rule', () => {
  test('triggers when speed above threshold', async () => {
    const position = { speed: 120 };
    const res = await overspeed.check({ tracker: {}, position, preferences: { thresholds: { overspeed: 100 } } });
    expect(res.triggered).toBe(true);
    expect(res.meta.speed).toBe(120);
  });

  test('does not trigger when below threshold', async () => {
    const position = { speed: 50 };
    const res = await overspeed.check({ tracker: {}, position, preferences: { thresholds: { overspeed: 100 } } });
    expect(res.triggered).toBe(false);
  });
});
