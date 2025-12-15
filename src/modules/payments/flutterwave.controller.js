import express from 'express';
import * as fw from '../../providers/flutterwave/flutterwave.service.js';
import bodyParser from 'body-parser';
const { json } = bodyParser;

const router = express.Router();

// init payment endpoint
router.post('/init', async (req, res) => {
  try {
    const { userId, amount, metadata, idempotencyKey } = req.body;
    const r = await fw.initPayment(userId, amount, metadata, idempotencyKey);
    return res.json({ success: true, data: r });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

// verify endpoint: check local record and optionally reverify with provider
router.get('/verify', async (req, res) => {
  try {
    const tx_ref = req.query.tx_ref || req.query.txRef || req.query.idempotencyKey;
    if (!tx_ref) return res.status(400).json({ success: false, error: 'tx_ref query param required' });

    // find local record
    const local = await (await import('../../modules/payments/payments.repository.js')).findPaymentByIdempotencyKey(String(tx_ref));
    // if pending, try remote verify and reconcile
    if (local && local.status === 'pending') {
      const remote = await fw.verifyAndReconcile(String(tx_ref));
      // fetch updated local record
      const updated = await (await import('../../modules/payments/payments.repository.js')).findPaymentByIdempotencyKey(String(tx_ref));
      return res.json({ success: true, data: { local: updated, remote } });
    }

    return res.json({ success: true, data: { local, remote: null } });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

// webhook endpoint: Flutterwave will POST JSON
// Capture raw body so we can validate provider HMAC signatures exactly as received
router.post('/webhook', json({ verify: (req, res, buf) => { req.rawBody = buf.toString(); } }), async (req, res) => {
  try {
    const headers = req.headers;
    const body = req.body;
    const raw = req.rawBody; // exact raw JSON string as received
    const r = await fw.handleWebhook(headers, body, raw);
    return res.json({ success: true, data: r });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ success: false, error: err.message });
  }
});

export default router;
