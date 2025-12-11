/**
 * SMS Controller
 * Handles SMS webhook requests
 */

import { handleSmsPayload } from './sms.service.js';
import logger from '../../utils/logger.js';

/**
 * SMS Webhook Handler
 * Receives SMS from various providers (Twilio, Termii, CallMeBot, etc.)
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
export async function smsWebhookHandler(req, res) {
  try {
    const rawPayload = req.body;

    // Log incoming webhook (sanitize sensitive data in production)
    logger.info({ 
      headers: req.headers,
      bodyKeys: Object.keys(rawPayload),
    }, 'SMS webhook received');

    // Process the SMS payload
    const result = await handleSmsPayload(rawPayload);

    // Return success response
    res.status(200).json({
      success: true,
      result: {
        positionId: result.positionId,
        eventsCount: result.events?.length || 0,
        alertsCount: result.alerts?.length || 0,
        duplicate: result.duplicate || false,
      },
    });
  } catch (err) {
    logger.error({ err, body: req.body }, 'SMS webhook handler error');

    // Determine status code based on error type
    let statusCode = 500;
    if (err.message?.includes('SMS_INVALID_FORMAT')) {
      statusCode = 400;
    } else if (err.message?.includes('SMS_TRACKER_NOT_FOUND')) {
      statusCode = 404;
    } else if (err.message?.includes('SMS_EMPTY_BODY')) {
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      error: err.message || 'Internal server error',
    });
  }
}
