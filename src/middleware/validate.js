import { z } from 'zod';
import { AppError } from '../core/errors.js';

export function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      return next();
    } catch (err) {
      // ZodError
      return next(new AppError('Invalid request body', 'INVALID_BODY', 400, err.errors));
    }
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query);
      return next();
    } catch (err) {
      return next(new AppError('Invalid query', 'INVALID_QUERY', 400, err.errors));
    }
  };
}

export function validateParams(schema) {
  return (req, res, next) => {
    try {
      req.params = schema.parse(req.params);
      return next();
    } catch (err) {
      return next(new AppError('Invalid params', 'INVALID_PARAMS', 400, err.errors));
    }
  };
}
