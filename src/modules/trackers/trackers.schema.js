// src/modules/trackers/trackers.schema.js (ESM)
import { z } from 'zod';

// Allowed enums
export const ProtocolEnum = z.enum(['GT06', 'OSMAND', 'TRACCAR', 'CUSTOM', 'GT06N']);
export const StatusEnum = z.enum(['active', 'inactive', 'installed', 'lost', 'maintenance']);

export const createTrackerSchema = z.object({
  imei: z.string().min(10).max(20),
  label: z.string().max(128).optional(),
  protocol: z.preprocess((val) => (val ? String(val).toUpperCase() : val), ProtocolEnum).default('GT06'),
  vehicleId: z.string().uuid().optional(),
  simNumber: z.string().optional(),
  iccid: z.string().optional(),
  apn: z.string().optional(),
  ipServer: z.string().optional(),
  port: z.number().int().positive().optional(),
});

export const updateTrackerSchema = z.object({
  label: z.string().max(128).optional(),
  protocol: ProtocolEnum.optional(),
  vehicleId: z.string().uuid().optional(),
  status: StatusEnum.optional(),
  batteryLevel: z.number().min(0).max(100).optional(),
});


