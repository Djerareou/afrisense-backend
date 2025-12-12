class AppError extends Error {
  constructor(message, code = 'ERR', status = 400, details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err && err.name === 'AppError') {
    return res.status(err.status || 400).json({ success: false, error: err.message, code: err.code, details: err.details });
  }
  console.error('Unhandled error', err && err.stack ? err.stack : err);
  return res.status(500).json({ success: false, error: 'Internal Server Error' });
}

export { AppError, errorHandler };
