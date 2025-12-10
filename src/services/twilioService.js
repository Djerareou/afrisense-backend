import twilio from 'twilio';

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_FROM_NUMBER,
  TWILIO_WHATSAPP_FROM
} = process.env;

function getClient() {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error('Twilio config missing. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in env.');
  }
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

export async function sendSms(to, body) {
  if (!to) throw new Error('`to` phone number is required (E.164 format, e.g. +1234567890)');
  const client = getClient();
  const from = TWILIO_FROM_NUMBER;
  if (!from) throw new Error('TWILIO_FROM_NUMBER not set in env');

  return client.messages.create({
    body,
    from,
    to
  });
}

export async function sendWhatsApp(to, body) {
  if (!to) throw new Error('`to` phone number is required (E.164 format, e.g. +1234567890)');
  const client = getClient();
  const from = TWILIO_WHATSAPP_FROM || (TWILIO_FROM_NUMBER ? `whatsapp:${TWILIO_FROM_NUMBER}` : null);
  if (!from) throw new Error('TWILIO_WHATSAPP_FROM or TWILIO_FROM_NUMBER must be set in env');
  const toFmt = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

  return client.messages.create({
    body,
    from,
    to: toFmt
  });
}

export default {
  sendSms,
  sendWhatsApp
};
