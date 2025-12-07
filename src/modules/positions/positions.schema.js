// src/modules/positions/positions.schema.js
import { z } from 'zod';

// Accept ISO string or epoch (s or ms)
const timestampPreprocess = z.preprocess((arg) => {
  if (typeof arg === 'number') {
    // treat as epoch (ms or s)
    return arg > 1e12 ? new Date(arg) : new Date(arg * 1000);
  }
  if (typeof arg === 'string') {
    const d = new Date(arg);
    if (!isNaN(d.getTime())) return d;
  }
  if (arg instanceof Date) return arg;
  return arg;
}, z.date());

export const positionSchema = z.object({
  trackerId: z.string().uuid().optional(),
  trackerImei: z.string().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timestamp: timestampPreprocess,
  // speed in km/h: 0..300 for validation
  speed: z.number().nonnegative().max(300).optional(),
  direction: z.number().min(0).max(360).optional(),
  altitude: z.number().optional(),
  eventType: z.string().optional(),
  batteryLevel: z.number().min(0).max(100).optional(),
  externalId: z.string().optional(),
  odometer: z.number().nonnegative().optional(),
  accuracy: z.number().nonnegative().optional(),
  source: z.enum(['tracker','gateway','manual','import']).optional(),
});

export const bulkPositionsSchema = z.array(positionSchema).min(1);
