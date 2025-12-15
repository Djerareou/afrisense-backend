// Minimal notification adapter with pluggable providers
import logger from '../../utils/logger.js';

const providers = {
  console: {
    send: async ({ to, subject, body, channel = 'sms' }) => {
      logger.info({ to, subject, body, channel }, 'notification:send');
      return { ok: true };
    }
  }
};

export async function sendNotification({ to, subject, body, channel = 'sms', provider = 'console' }) {
  const p = providers[provider] || providers.console;
  return p.send({ to, subject, body, channel });
}

export default { sendNotification };
