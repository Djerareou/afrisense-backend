#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config();

// Note: dynamic import of NotificationService happens inside main() so dotenv is applied first

async function main() {
  const alert = {
    id: 'test-alert-' + Date.now(),
    title: 'Test notification from AfriSense',
  message: 'Ceci est un test d\'envoi de notifications (email / sms / whatsapp)',
  };

  const user = {
    id: 'local-test-user',
    email: process.env.NOTIFY_OVERRIDE_EMAIL || 'djerareoumbainaissem@gmail.com',
    phone: process.env.NOTIFY_OVERRIDE_PHONE || '+23565579675'
  };

  console.log('Test notification -> email:', user.email, 'phone:', user.phone);
  try {
    const mod = await import('../src/services/notification.service.js');
    const NotificationService = mod.default || mod;
    const result = await NotificationService.notifyAll(alert, user);
    console.log('NotificationService result:', result);
  } catch (err) {
    console.error('NotificationService failed:', err);
    process.exitCode = 1;
  }
}

main();
