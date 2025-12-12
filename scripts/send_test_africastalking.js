#!/usr/bin/env node
/*
 * scripts/send_test_africastalking.js
 * Small, well-documented test helper to send an SMS via Africa's Talking.
 * It reads AFRICASTALKING_USERNAME and AFRICASTALKING_API_KEY from env (or from .env if you load it).
 * Usage (CLI):
 *   AFRICASTALKING_USERNAME=sandbox AFRICASTALKING_API_KEY=atsk_xxx node scripts/send_test_africastalking.js [+234...] ["Message text"]
 */
import africastalking from 'africastalking';
import dotenv from 'dotenv';

dotenv.config();

const USERNAME = process.env.AFRICASTALKING_USERNAME || process.env.AT_USERNAME || process.env.AFRICASTALKING_USER;
const API_KEY = process.env.AFRICASTALKING_API_KEY || process.env.AT_API_KEY || process.env.AFRICASTALKING_KEY;

function requireConfig() {
  if (!USERNAME || !API_KEY) {
    console.error('Missing Africa\'s Talking credentials. Set AFRICASTALKING_USERNAME and AFRICASTALKING_API_KEY in environment or in .env');
    process.exit(1);
  }
}

export async function sendTestSMS(to = '+2349033002884', message = 'Test SMS depuis Sandbox AfriSense 🚀') {
  requireConfig();
  const AT = africastalking({ username: USERNAME, apiKey: API_KEY });
  const sms = AT.SMS;
  try {
    const response = await sms.send({ to: Array.isArray(to) ? to : [to], message, bulkSMSMode: 1 });
    // Normalize response for logging
    const msg = response?.SMSMessageData?.Message || null;
    const recipients = response?.SMSMessageData?.Recipients || [];
    console.log('SMS send result:');
    console.log('  Message:', msg);
    if (recipients.length) {
      console.log('  Recipients:');
      for (const r of recipients) {
        console.log(`    - number=${r.number} status=${r.status} messageId=${r.messageId || r.id || '(n/a)'} cost=${r.cost || '(n/a)'} failureReason=${r.failureReason || '(none)'} `);
      }
    }
    return response;
  } catch (err) {
    // Print compact, useful error info (no secrets)
    console.error('Africa\'s Talking send error:', err?.response?.status || err?.code || 'UNKNOWN', '-', err?.response?.data || err?.message || String(err));
    throw err;
  }
}

// CLI runner
if (process.argv[1] && process.argv[1].endsWith('send_test_africastalking.js')) {
  const [, , toArg, ...msgParts] = process.argv;
  const to = toArg || '+2349033002884';
  const message = msgParts.length ? msgParts.join(' ') : undefined;
  sendTestSMS(to, message).then(() => process.exit(0)).catch(() => process.exit(2));
}
