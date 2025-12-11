import { errorHandler, notFoundHandler } from '../../middleware/errorHandler.js';
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  BadRequestError
} from '../../utils/errors.js';

describe('errorHandler middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    console.error = jest.fn(); // Suppress console output in tests
  });

  test('handles AppError with correct status and message', () => {
    const error = new NotFoundError('Resource not found');
    
    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      status: 'fail',
      message: 'Resource not found'
    });
  });

  test('handles ValidationError with 400 status', () => {
    const error = new ValidationError('Invalid input data');
    
    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      status: 'fail',
      message: 'Invalid input data'
    });
  });

  test('handles UnauthorizedError with 401 status', () => {
    const error = new UnauthorizedError('Authentication required');
    
    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      status: 'fail',
      message: 'Authentication required'
    });
  });

  test('handles generic Error with 500 status in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    const error = new Error('Something went wrong');
    
    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      status: 'error',
      message: 'Internal server error'
    });

    process.env.NODE_ENV = originalEnv;
  });

  test('includes error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    const error = new Error('Development error');
    error.stack = 'Error stack trace';
    
    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    const response = res.json.mock.calls[0][0];
    expect(response).toHaveProperty('message', 'Development error');
    expect(response).toHaveProperty('stack');

    process.env.NODE_ENV = originalEnv;
  });

  test('handles Prisma unique constraint error', () => {
    const error = new Error('Unique constraint failed');
    error.code = 'P2002';
    
    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        status: 'fail',
        message: expect.stringContaining('already exists')
      })
    );
  });

  test('handles Prisma record not found error', () => {
    const error = new Error('Record not found');
    error.code = 'P2025';
    
    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        status: 'fail',
        message: expect.stringContaining('not found')
      })
    );
  });

  test('handles JWT token expired error', () => {
    const error = new Error('jwt expired');
    error.name = 'TokenExpiredError';
    
    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('expired')
      })
    );
  });

  test('handles Zod validation error', () => {
    const error = {
      name: 'ZodError',
      errors: [
        { path: ['email'], message: 'Invalid email' },
        { path: ['age'], message: 'Must be positive' }
      ]
    };
    
    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    const response = res.json.mock.calls[0][0];
    expect(response.success).toBe(false);
    expect(response.details).toHaveLength(2);
  });
});

describe('notFoundHandler middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      originalUrl: '/api/nonexistent',
      method: 'GET'
    };
    res = {};
    next = jest.fn();
  });

  test('creates NotFoundError with request details', () => {
    notFoundHandler(req, res, next);

    expect(next).toHaveBeenCalled();
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.message).toContain('/api/nonexistent');
    expect(error.message).toContain('GET');
  });
});
