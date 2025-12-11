#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config();


// Usage:
//   node src/scripts/test_notify_alert.js [+235...] [test@example.com] ["Message body"]
// Or set NOTIFY_OVERRIDE_PHONE / TEST_TO_NUMBER in env and run `npm run test-notify`

const toPhone = process.argv[2] || process.env.TEST_TO_NUMBER || process.env.NOTIFY_OVERRIDE_PHONE;
const toEmail = process.argv[3] || process.env.TEST_TO_EMAIL;
const message = process.argv[4] || `AfriSense test alert sent at ${new Date().toISOString()}`;

if (!toPhone && !toEmail) {
  console.error('No destination configured. Provide a phone or email as argument or set TEST_TO_NUMBER / TEST_TO_EMAIL or NOTIFY_OVERRIDE_PHONE in env.');
  process.exit(1);
}

const user = { id: 'test-user', phone: toPhone, email: toEmail };
const alert = { title: 'AfriSense test alert', message };

// Important: import notification service after dotenv.config so env vars are available to the module
(async () => {
  try {
    const notificationModule = await import('../services/notification.service.js');
    const notificationService = notificationModule.default || notificationModule;

    console.log('Sending test notification to', { phone: toPhone, email: toEmail });
    const result = await notificationService.notifyAll(alert, user);
    console.log('Result:', result);
    process.exit(0);
  } catch (err) {
    console.error('Failed to send test notification:', err);
    process.exit(2);
  }
})();
