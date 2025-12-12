import africastalking from 'africastalking';

const { AT_USERNAME, AT_API_KEY, AT_SENDER_ID } = process.env;

function getClient() {
  if (!AT_USERNAME || !AT_API_KEY) {
    throw new Error('Africa\'s Talking config missing. Set AT_USERNAME and AT_API_KEY in env.');
  }
  return africastalking({ username: AT_USERNAME, apiKey: AT_API_KEY });
}

export async function sendSms(to, message) {
  if (!to) throw new Error('`to` phone number is required');
  const client = getClient();
  const sms = client.SMS;
  const from = AT_SENDER_ID || undefined;
  try {
    const res = await sms.send({ to, message, from });
    // africastalking returns array of recipients with status
    // We consider success if at least one recipient has status 'Success'
    const recipients = res && res.SMSMessageData && res.SMSMessageData.Recipients ? res.SMSMessageData.Recipients : [];
    const ok = recipients.some(r => /success/i.test(r.status || ''));
    // Try to extract a provider reference (message id) from first recipient
    const first = recipients[0] || {};
    const providerRef = first.messageId || first.id || first.messageId || null;
    return { ok, raw: res, providerRef };
  } catch (err) {
    console.error('africastalking: sms send failed', String(err));
    return null;
  }
}

export default { sendSms };
