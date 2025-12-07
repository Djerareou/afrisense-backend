import fs from 'fs';
import path from 'path';
import pino from 'pino';
import rfs from 'rotating-file-stream';

const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

// rotating file stream: rotate daily, keep 7 days
// support different module shapes (some versions export the function directly)
const createStreamFn = (rfs && typeof rfs.createStream === 'function') ? rfs.createStream : (typeof rfs === 'function' ? rfs : null);
let stream;
if (createStreamFn) {
  stream = createStreamFn('app.log', {
    interval: '1d',
    path: LOG_DIR,
    maxFiles: 7,
  });
} else {
  // fallback to a writable stream to stdout when rotating-file-stream is unavailable
  stream = process.stdout;
}

const level = process.env.LOG_LEVEL || 'info';

// If LOG_TO_CONSOLE is set, also log to stdout by creating a pino multistream-like behavior
let logger;
if (process.env.LOG_TO_CONSOLE === 'true') {
  // write to both stdout and rotating file by creating two loggers that use the same level
  const fileLogger = pino({ level }, stream);
  const consoleLogger = pino({ level }, pino.destination(1));
  // simple proxy that writes to both
  logger = {
    info: (...args) => { consoleLogger.info(...args); fileLogger.info(...args); },
    warn: (...args) => { consoleLogger.warn(...args); fileLogger.warn(...args); },
    error: (...args) => { consoleLogger.error(...args); fileLogger.error(...args); },
    debug: (...args) => { consoleLogger.debug(...args); fileLogger.debug(...args); },
  };
} else {
  // only file logging
  logger = pino({ level }, stream);
}

export default logger;
