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
  try {
    const res = await client.messages.create({ body, from, to });
    console.log('twilio: sms sent', { sid: res?.sid, to, from, status: res?.status });
    return res;
  } catch (err) {
    console.error('twilio: sms send failed', { err: String(err), to, from });
    return null;
  }
}

export async function sendWhatsApp(to, body) {
  if (!to) throw new Error('`to` phone number is required (E.164 format, e.g. +1234567890)');
  const client = getClient();
  const from = TWILIO_WHATSAPP_FROM || (TWILIO_FROM_NUMBER ? `whatsapp:${TWILIO_FROM_NUMBER}` : null);
  if (!from) throw new Error('TWILIO_WHATSAPP_FROM or TWILIO_FROM_NUMBER must be set in env');
  const toFmt = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  try {
    const res = await client.messages.create({ body, from, to: toFmt });
    console.log('twilio: whatsapp sent', { sid: res?.sid, to: toFmt, from, status: res?.status });
    return res;
  } catch (err) {
    console.error('twilio: whatsapp send failed', { err: String(err), to: toFmt, from });
    return null;
  }
}

export default {
  sendSms,
  sendWhatsApp
};
