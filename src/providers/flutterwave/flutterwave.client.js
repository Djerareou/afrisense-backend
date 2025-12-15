const BASE = process.env.FLUTTERWAVE_BASE_URL || 'https://api.flutterwave.com/v3';
const SECRET = process.env.FLUTTERWAVE_SECRET_KEY || '';

// Helper that uses global fetch when available (Node 18+), otherwise dynamically imports node-fetch.
async function _fetch(...args) {
  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch(...args);
  }
  // dynamic import to avoid requiring ESM node-fetch at top-level (Jest compatibility)
  const nodeFetch = await import('node-fetch');
  return nodeFetch.default(...args);
}

export async function createPaymentInit({ amount, currency = 'XAF', tx_ref, redirect_url = null, customer = {} }) {
  if (!SECRET) {
    // sandbox/mocked response when not configured
    return { status: 'success', data: { link: `https://sandbox.flutterwave.com/pay/${tx_ref}`, id: `mock-${tx_ref}` } };
  }

  const body = {
    tx_ref,
    amount,
    currency,
    redirect_url,
    customer,
  };

  const res = await _fetch(`${BASE}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SECRET}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  return json;
}

export async function getTransaction(id) {
  if (!SECRET) return null;
  const res = await _fetch(`${BASE}/transactions/${id}/verify`, {
    headers: { Authorization: `Bearer ${SECRET}` },
  });
  return res.json();
}

export default { createPaymentInit, getTransaction };
