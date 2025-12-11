import { z } from 'zod';

/**
 * Alert type enum values
 */
export const AlertTypeEnum = z.enum([
  'GEOFENCE_ENTER',
  'GEOFENCE_EXIT',
  'OVERSPEED',
  'NO_MOVEMENT',
  'LOW_BATTERY',
  'SIGNAL_LOSS',
  'SUSPICIOUS_STOP',
  'HIGH_TEMPERATURE',
  'DEVICE_OFFLINE'
]);

/**
 * Schema for creating an alert
 */
export const createAlertSchema = z.object({
  trackerId: z.string().uuid('Invalid tracker ID format'),
  type: AlertTypeEnum,
  positionId: z.string().uuid('Invalid position ID format'),
  geofenceId: z.string().uuid('Invalid geofence ID format').optional().nullable(),
  meta: z.record(z.any()).optional().nullable()
});

/**
 * Schema for listing alerts with filters
 */
export const listAlertsSchema = z.object({
  type: AlertTypeEnum.optional(),
  trackerId: z.string().uuid().optional(),
  geofenceId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(100).default(50)
});

/**
 * Schema for alert ID parameter
 */
export const alertIdSchema = z.object({
  id: z.string().uuid('Invalid alert ID format')
});

/**
 * Schema for updating alert settings
 */
export const updateSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  channels: z.object({
    EMAIL: z.boolean().optional(),
    SMS: z.boolean().optional(),
    CONSOLE: z.boolean().optional(),
    PUSH: z.boolean().optional()
  }).optional(),
  thresholds: z.record(z.number()).optional(),
  timezone: z.string().optional()
});

/**
 * Schema for test email endpoint
 */
export const testEmailSchema = z.object({
  email: z.string().email('Invalid email format')
});

/**
 * Schema for test SMS endpoint
 */
export const testSMSSchema = z.object({
  phoneNumber: z.string().regex(/^\+?\d{10,15}$/, 'Invalid phone number format')
});

/**
 * Middleware to validate request body
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 */
export const validateBody = schema => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message
        }))
      });
    }
    next(error);
  }
};

/**
 * Middleware to validate request query parameters
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 */
export const validateQuery = schema => (req, res, next) => {
  try {
    req.query = schema.parse(req.query);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message
        }))
      });
    }
    next(error);
  }
};

/**
 * Middleware to validate request params
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 */
export const validateParams = schema => (req, res, next) => {
  try {
    req.params = schema.parse(req.params);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message
        }))
      });
    }
    next(error);
  }
};
