import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export const auditLog = async ({ userId, action, status }) => {
  logger.info({ userId, action, status, date: new Date() }, 'audit');
  // Pour production : enregistrer en DB ou service externe
};
