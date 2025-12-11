// Node 18+ has global fetch. Nodemailer will be dynamically imported when needed.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;
const CALLMEBOT_API_KEY = process.env.CALLMEBOT_API_KEY;
const CALLMEBOT_SMS_URL = process.env.CALLMEBOT_SMS_URL;
const CALLMEBOT_WHATSAPP_URL = process.env.CALLMEBOT_WHATSAPP_URL;
const SMTP_PREFERRED = process.env.SMTP_PREFERRED === 'true';

// Overrides: if set, these force all notifications to the provided recipient
const NOTIFY_OVERRIDE_EMAIL = process.env.NOTIFY_OVERRIDE_EMAIL || '';
const NOTIFY_OVERRIDE_PHONE = process.env.NOTIFY_OVERRIDE_PHONE || '';

async function notifyByEmail(alert, user) {
  console.log('notifyByEmail start', { hasResend: Boolean(RESEND_API_KEY), resendFrom: RESEND_FROM_EMAIL, smtpHost: process.env.SMTP_HOST, smtpPreferred: SMTP_PREFERRED });

  const toEmail = NOTIFY_OVERRIDE_EMAIL || user?.email || process.env.DEFAULT_ALERT_EMAIL;

  // Helper to send via SMTP
  const sendViaSMTP = async () => {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('SMTP not configured properly; skipping SMTP send');
      return false;
    }
    const nodemailerModule = await import('nodemailer').catch(() => null);
    if (!nodemailerModule) {
      console.error('nodemailer import failed');
      return false;
    }
    const nodemailer = nodemailerModule.default || nodemailerModule;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || RESEND_FROM_EMAIL || process.env.SMTP_USER,
        to: toEmail,
        subject: `[AfriSense] ${alert.title}`,
        text: alert.message,
        html: `<pre>${alert.message}</pre>`
      });
      return true;
    } catch (e) {
      console.error('SMTP send failed', String(e));
      return false;
    }
  };

  // If SMTP is preferred or Resend is not available, try SMTP first
  if (SMTP_PREFERRED || (!RESEND_API_KEY && process.env.SMTP_HOST)) {
    const ok = await sendViaSMTP();
    if (ok) return true;
    // If SMTP failed and Resend is available, fall back
    if (!RESEND_API_KEY) return false;
    console.log('SMTP failed; attempting Resend fallback');
  }

  // Use Resend API if key provided, otherwise fallback to nodemailer using SMTP env
  if (RESEND_API_KEY && RESEND_FROM_EMAIL) {
    console.log('notifyByEmail using Resend path, to:', toEmail);
    const body = JSON.stringify({ from: RESEND_FROM_EMAIL, to: toEmail, subject: `[AfriSense] ${alert.title}`, html: `<pre>${alert.message}</pre>` });
    try {
      const res = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body });
      if (!res.ok) {
        let text = '';
        try { text = await res.text(); } catch (e) { /* ignore */ }
        console.error('Resend API error', res.status, text);

        // If Resend rejects because the from-domain is not verified, try SMTP fallback if configured
        if (res.status === 403 && /domain is not verified|validation_error/i.test(text) && process.env.SMTP_HOST) {
          console.log('Resend refused (domain not verified) - falling back to SMTP');
          const smtpOk = await sendViaSMTP();
          return Boolean(smtpOk);
        }

        return false;
      }
      return true;
    } catch (err) {
      console.error('Resend fetch failed', String(err));
      // If Resend fetch throws and SMTP is available, try SMTP
      if (process.env.SMTP_HOST) {
        console.log('Resend fetch failed; trying SMTP fallback');
        const smtpOk = await sendViaSMTP();
        return Boolean(smtpOk);
      }
      return false;
    }
  }

  // final fallback: try SMTP if available
  if (process.env.SMTP_HOST) {
    return Boolean(await sendViaSMTP());
  }
  return false;
}

async function notifyBySMS(alert, user) {
  const toPhone = NOTIFY_OVERRIDE_PHONE || user?.phone || '';

  // Prefer Twilio if configured
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && (process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_WHATSAPP_FROM)) {
    try {
      const twilioSvc = await import('../services/twilioService.js').then(m => m.default || m);
      const res = await twilioSvc.sendSms(toPhone, alert.message).catch(() => null);
      return Boolean(res && res.sid);
    } catch (err) {
      console.error('Twilio SMS send failed', String(err));
      // fall through to other providers
    }
  }

  // Fallback to CallMeBot if configured
  // Next fallback: Africa's Talking if configured
  if (process.env.AT_USERNAME && process.env.AT_API_KEY) {
    try {
      const atSvc = await import('./africasTalkingService.js').then(m => m.default || m);
      const res = await atSvc.sendSms(toPhone, alert.message).catch(() => null);
      if (res && (res.ok === true || (res.raw && res.raw.SMSMessageData))) return true;
    } catch (err) {
      console.error('Africa\'s Talking SMS send failed', String(err));
      // fall through to other providers
    }
  }

  // Fallback to CallMeBot if configured
  if (!CALLMEBOT_API_KEY || !CALLMEBOT_SMS_URL) return null;
  const sep = CALLMEBOT_SMS_URL.includes('?') ? '&' : '?';
  const url = `${CALLMEBOT_SMS_URL}${sep}apikey=${CALLMEBOT_API_KEY}&text=${encodeURIComponent(alert.message)}&to=${encodeURIComponent(toPhone)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      try { const t = await res.text(); console.error('CallMeBot SMS error', res.status, t); } catch (e) { console.error('CallMeBot SMS error', res.status); }
      return false;
    }
    return true;
  } catch (err) {
    console.error('CallMeBot SMS fetch failed', String(err));
    return false;
  }
}

async function notifyByWhatsApp(alert, user) {
  const toPhone = NOTIFY_OVERRIDE_PHONE || user?.phone || '';

  // Prefer Twilio WhatsApp if configured
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && (process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_FROM_NUMBER)) {
    try {
      const twilioSvc = await import('../services/twilioService.js').then(m => m.default || m);
      const res = await twilioSvc.sendWhatsApp(toPhone, alert.message).catch(() => null);
      return Boolean(res && res.sid);
    } catch (err) {
      console.error('Twilio WhatsApp send failed', String(err));
      // fall through to other providers
    }
  }

  // Fallback to CallMeBot if configured
  if (!CALLMEBOT_API_KEY || !CALLMEBOT_WHATSAPP_URL) return null;
  const sep = CALLMEBOT_WHATSAPP_URL.includes('?') ? '&' : '?';
  const url = `${CALLMEBOT_WHATSAPP_URL}${sep}apikey=${CALLMEBOT_API_KEY}&text=${encodeURIComponent(alert.message)}&to=${encodeURIComponent(toPhone)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      try { const t = await res.text(); console.error('CallMeBot WhatsApp error', res.status, t); } catch (e) { console.error('CallMeBot WhatsApp error', res.status); }
      return false;
    }
    return true;
  } catch (err) {
    console.error('CallMeBot WhatsApp fetch failed', String(err));
    return false;
  }
}

async function notifyAll(alert, user) {
  console.log('notifyAll invoked, user:', user?.id, 'channels env check: RESEND=', Boolean(RESEND_API_KEY), 'CALLMEBOT=', Boolean(CALLMEBOT_API_KEY));
  if (!user) return;
  const results = {};
  // Determine channels from user's AlertSetting if available; fallback to email
  let channels = ['email'];
  try {
    const prefRaw = await (await import('../config/prismaClient.js')).prisma.alertSetting.findUnique({ where: { userId: user.id } }).catch(() => null);
    if (prefRaw && prefRaw.channels) {
      const channelsObj = JSON.parse(prefRaw.channels);
      channels = Object.keys(channelsObj).filter(k => channelsObj[k]);
    }
  } catch (e) {
    // keep default
  }

    // If an override phone is configured for testing, ensure sms/whatsapp are attempted
    if (NOTIFY_OVERRIDE_PHONE) {
      if (!channels.includes('sms')) channels.push('sms');
      if (!channels.includes('whatsapp')) channels.push('whatsapp');
    }

  if (channels.includes('email')) results.email = await notifyByEmail(alert, user).catch(() => false);
  if (channels.includes('sms')) results.sms = await notifyBySMS(alert, user).catch(() => false);
  if (channels.includes('whatsapp')) results.whatsapp = await notifyByWhatsApp(alert, user).catch(() => false);

  return results;
}

export default {
  notifyByEmail,
  notifyBySMS,
  notifyByWhatsApp,
  notifyAll
};
