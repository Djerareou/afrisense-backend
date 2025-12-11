#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config();

import { sendSms, sendWhatsApp } from '../services/twilioService.js';

const to = process.env.TEST_TO_NUMBER || process.argv[2];
const mode = (process.env.TEST_MODE || process.argv[3] || 'sms').toLowerCase();

if (!to) {
  console.error('Usage: TEST_TO_NUMBER=+123... node src/scripts/send_test_twilio.js [+123...] [sms|whatsapp]');
  process.exit(1);
}

(async () => {
  try {
    if (mode === 'whatsapp') {
      const res = await sendWhatsApp(to, 'Test message from AfriSense via Twilio WhatsApp');
      console.log('WhatsApp message sent, sid=', res.sid);
    } else {
      const res = await sendSms(to, 'Test message from AfriSense via Twilio SMS');
      console.log('SMS sent, sid=', res.sid);
    }
    process.exit(0);
  } catch (err) {
    console.error('Failed to send test message:', err.message || err);
    process.exit(2);
  }
})();
