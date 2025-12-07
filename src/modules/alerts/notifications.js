import logger from '../../utils/logger.js';

/**
 * Send email via Resend API
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} body - Email body
 * @returns {Promise<Object>} Response from Resend
 */
async function sendEmailViaResend(to, subject, body) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'alerts@afrisense.com';
  
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured');
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: subject,
        text: body
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${response.status} - ${error}`);
    }

    return await response.json();
  } catch (err) {
    logger.error({ err, to, subject }, 'notifications:resend_error');
    throw err;
  }
}

/**
 * Send WhatsApp message via CallMeBot API
 * Note: CallMeBot primarily uses WhatsApp. For true SMS, consider integrating Twilio or similar.
 * @param {string} phoneNumber - Phone number in international format (e.g., +237xxxxxxxxx)
 * @param {string} message - Message text
 * @returns {Promise<Object>} Response from CallMeBot
 */
async function sendSMSViaCallMeBot(phoneNumber, message) {
  const CALLMEBOT_API_KEY = process.env.CALLMEBOT_API_KEY;
  
  if (!CALLMEBOT_API_KEY) {
    throw new Error('CALLMEBOT_API_KEY not configured');
  }

  // Validate and sanitize phone number
  const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
  if (!cleanPhone.match(/^\+?\d{10,15}$/)) {
    throw new Error('Invalid phone number format. Expected: +[country code][number]');
  }

  try {
    // CallMeBot WhatsApp API endpoint
    const encodedMessage = encodeURIComponent(message);
    const encodedPhone = encodeURIComponent(cleanPhone);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodedPhone}&text=${encodedMessage}&apikey=${CALLMEBOT_API_KEY}`;
    
    const response = await fetch(url, { method: 'GET' });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`CallMeBot API error: ${response.status} - ${error}`);
    }

    const result = await response.text();
    return { status: 'sent', response: result };
  } catch (err) {
    logger.error({ err, phoneNumber: cleanPhone }, 'notifications:callmebot_error');
    throw err;
  }
}

/**
 * Send notification through specified channel
 * @param {string} channel - Notification channel (EMAIL, SMS, CONSOLE, PUSH)
 * @param {string} target - Target address (email or phone)
 * @param {string} subject - Message subject/title
 * @param {string} body - Message body
 * @param {Object} opts - Additional options
 * @returns {Promise<Object>} Send result
 */
export async function send(channel, target, subject, body, opts = {}) {
  const channelUpper = (channel || 'CONSOLE').toUpperCase();
  
  try {
    switch (channelUpper) {
      case 'EMAIL': {
        if (!target) throw new Error('Email target is required');
        const result = await sendEmailViaResend(target, subject, body);
        logger.info({ channel, target, subject }, 'notifications:email_sent');
        return result;
      }
      
      case 'SMS': {
        if (!target) throw new Error('Phone number is required');
        const result = await sendSMSViaCallMeBot(target, `${subject}: ${body}`);
        logger.info({ channel, target }, 'notifications:sms_sent');
        return result;
      }
      
      case 'PUSH': {
        // Placeholder for future push notification implementation
        logger.info({ channel, target, subject, body }, 'notifications:push_not_implemented');
        return { status: 'not_implemented', message: 'Push notifications coming soon' };
      }
      
      case 'CONSOLE':
      default: {
        logger.info({ channel, target, subject, body }, 'notifications:console');
        return { accepted: ['console'], messageId: `console-${Date.now()}` };
      }
    }
  } catch (err) {
    logger.error({ err, channel, target, subject }, 'notifications:send_error');
    throw err;
  }
}

/**
 * Test email sending
 * @param {string} to - Test email recipient
 * @returns {Promise<Object>} Test result
 */
export async function testEmail(to) {
  return send('EMAIL', to, 'Test Alert Email', 'This is a test alert email from AfriSense.');
}

/**
 * Test SMS sending
 * @param {string} phoneNumber - Test phone number
 * @returns {Promise<Object>} Test result
 */
export async function testSMS(phoneNumber) {
  return send('SMS', phoneNumber, 'Test Alert', 'This is a test alert SMS from AfriSense.');
}
