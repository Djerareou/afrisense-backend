import logger from '../../utils/logger.js';

// Simple abstraction over notification providers. Exports send(channel, to, subject, body, opts)
let mailerPromise = null;
async function getMailer() {
  if (mailerPromise) return mailerPromise;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;
  // lazily import nodemailer only when SMTP is configured
  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    mailerPromise = transporter;
    return transporter;
  } catch (err) {
    logger.warn({ err }, 'notifications:nodemailer_missing');
    return null;
  }
}

export async function send(channel, target, subject, body, opts = {}) {
  switch ((channel || 'CONSOLE').toUpperCase()) {
    case 'EMAIL': {
      const mailer = await getMailer();
      if (!mailer) throw new Error('SMTP not configured');
      return mailer.sendMail({ from: process.env.SMTP_FROM || 'no-reply@example.com', to: target, subject, text: body });
    }
    case 'CONSOLE':
    default:
      logger.info({ channel, target, subject, body }, 'notifications:console');
      return { accepted: ['console'] };
  }
}
