import { positionSchema } from '../../modules/positions/positions.schema.js';

describe('positions.schema (Zod) validation', () => {
  test('accepts valid latitude/longitude and timestamp ISO', () => {
    const payload = {
      trackerImei: '123456789012345',
      latitude: 45.5,
      longitude: 3.5,
      timestamp: new Date().toISOString(),
      speed: 50,
    };
    expect(() => positionSchema.parse(payload)).not.toThrow();
  });

  test('rejects invalid latitude/longitude', () => {
    const bads = [
      { latitude: -100, longitude: 0 },
      { latitude: 0, longitude: -200 },
    ];
    for (const b of bads) {
      const p = { trackerImei: '123', timestamp: new Date().toISOString(), ...b };
      expect(() => positionSchema.parse(p)).toThrow();
    }
  });

  test('rejects missing required fields', () => {
    const p = { latitude: 10 }; // missing longitude and timestamp
    expect(() => positionSchema.parse(p)).toThrow();
  });

  test('rejects speed out of bounds (negative or >300)', () => {
    const p1 = { trackerImei: '123', latitude: 10, longitude: 10, timestamp: new Date().toISOString(), speed: -1 };
    const p2 = { trackerImei: '123', latitude: 10, longitude: 10, timestamp: new Date().toISOString(), speed: 1000 };
    expect(() => positionSchema.parse(p1)).toThrow();
    expect(() => positionSchema.parse(p2)).toThrow();
  });

  test('accepts numeric epoch timestamp (ms)', () => {
    const now = Date.now();
    const p = { trackerImei: '123', latitude: 10, longitude: 10, timestamp: now };
    expect(() => positionSchema.parse(p)).not.toThrow();
  });

  test('rejects invalid ISO timestamp string', () => {
    const p = { trackerImei: '123', latitude: 10, longitude: 10, timestamp: 'not-a-date' };
    expect(() => positionSchema.parse(p)).toThrow();
  });
});
