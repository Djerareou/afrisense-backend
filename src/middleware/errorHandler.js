import logger from '../utils/logger.js';
import { AppError } from '../utils/errors.js';

/**
 * Convert operational errors to standard format
 * @param {Error} err - Error object
 * @returns {Object} Standardized error response
 */
function formatError(err) {
  // Handle Prisma errors
  if (err.code && err.code.startsWith('P')) {
    return handlePrismaError(err);
  }

  // Handle validation errors (from Zod)
  if (err.name === 'ZodError') {
    return {
      statusCode: 400,
      status: 'fail',
      message: 'Validation failed',
      details: err.errors?.map(e => ({
        path: e.path.join('.'),
        message: e.message
      }))
    };
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return {
      statusCode: 401,
      status: 'fail',
      message: 'Invalid token'
    };
  }

  if (err.name === 'TokenExpiredError') {
    return {
      statusCode: 401,
      status: 'fail',
      message: 'Token expired'
    };
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    return {
      statusCode: err.statusCode,
      status: err.status,
      message: err.message,
      details: err.details
    };
  }

  // Default error
  return {
    statusCode: 500,
    status: 'error',
    message: err.message || 'Internal server error'
  };
}

/**
 * Handle Prisma-specific errors
 * @param {Error} err - Prisma error
 * @returns {Object} Formatted error response
 */
function handlePrismaError(err) {
  switch (err.code) {
    case 'P2002':
      return {
        statusCode: 409,
        status: 'fail',
        message: 'Duplicate entry',
        details: err.meta?.target
      };
    case 'P2025':
      return {
        statusCode: 404,
        status: 'fail',
        message: 'Record not found'
      };
    case 'P2003':
      return {
        statusCode: 400,
        status: 'fail',
        message: 'Foreign key constraint failed',
        details: err.meta?.field_name
      };
    case 'P2014':
      return {
        statusCode: 400,
        status: 'fail',
        message: 'Invalid relation',
        details: err.meta
      };
    default:
      return {
        statusCode: 500,
        status: 'error',
        message: 'Database error'
      };
  }
}

/**
 * Global error handling middleware
 * @param {Error} err - Error object
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Express next function
 */
export function errorHandler(err, req, res, next) {
  const formattedError = formatError(err);

  // Log error details
  if (formattedError.statusCode >= 500) {
    logger.error({
      err,
      req: {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body
      }
    }, 'error_handler:server_error');
  } else {
    logger.warn({
      message: formattedError.message,
      statusCode: formattedError.statusCode,
      path: req.path
    }, 'error_handler:client_error');
  }

  // Send error response
  const response = {
    success: false,
    status: formattedError.status,
    message: formattedError.message
  };

  // Include details in development or for client errors
  if (formattedError.details) {
    response.details = formattedError.details;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack;
  }

  res.status(formattedError.statusCode).json(response);
}

/**
 * Handle 404 - Route not found
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Express next function
 */
export function notFoundHandler(req, res, next) {
  const err = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(err);
}

/**
 * Async handler wrapper to catch errors in async functions
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
