import { z } from "zod";

export const createGeofenceSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["circle", "polygon"]),
  description: z.string().optional(),

  center: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),

  radius: z.number().positive().optional(),

  coordinates: z.array(
    z.object({
      lat: z.number(),
      lng: z.number(),
    })
  ).optional(),

  color: z.string().optional(),
});

export const updateGeofenceSchema = createGeofenceSchema.partial();
