/**
 * Custom Error Classes for standardized error handling
 */

/**
 * Base application error class
 */
export class AppError extends Error {
  /**
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {boolean} isOperational - Whether error is operational (expected)
   */
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  /**
   * @param {string} message - Validation error message
   * @param {Array<Object>} details - Validation error details
   */
  constructor(message = 'Validation failed', details) {
    super(message, 400);
    this.name = 'ValidationError';
    // only set details if provided to avoid sending empty arrays in responses
    if (details !== undefined) this.details = details;
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  /**
   * @param {string} messageOrResource - Either a full message or a resource name
   */
  constructor(messageOrResource = 'Resource') {
    const msg = String(messageOrResource || 'Resource');
    // If caller passed a full sentence containing 'not found', use it as-is
    const finalMessage = msg.toLowerCase().includes('not found') ? msg : `${msg} not found`;
    super(finalMessage, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Unauthorized error (401)
 */
export class UnauthorizedError extends AppError {
  /**
   * @param {string} message - Unauthorized error message
   */
  constructor(message = 'Authentication required') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden error (403)
 */
export class ForbiddenError extends AppError {
  /**
   * @param {string} message - Forbidden error message
   */
  constructor(message = 'Access forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends AppError {
  /**
   * @param {string} message - Conflict error message
   */
  constructor(message = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * Bad request error (400)
 */
export class BadRequestError extends AppError {
  /**
   * @param {string} message - Bad request error message
   */
  constructor(message = 'Bad request') {
    super(message, 400);
    this.name = 'BadRequestError';
  }
}

/**
 * Internal server error (500)
 */
export class InternalServerError extends AppError {
  /**
   * @param {string} message - Internal error message
   */
  constructor(message = 'Internal server error') {
    super(message, 500, false);
    this.name = 'InternalServerError';
  }
}

/**
 * Service unavailable error (503)
 */
export class ServiceUnavailableError extends AppError {
  /**
   * @param {string} message - Service unavailable message
   */
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503);
    this.name = 'ServiceUnavailableError';
  }
}
