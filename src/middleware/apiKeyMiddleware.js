// src/middleware/apiKeyMiddleware.js
export function apiKeyMiddleware(req, res, next) {
  const key = req.header('x-traccar-api-key') || req.query.apiKey;
  if (!key || key !== process.env.TRACCAR_API_KEY) {
    return res.status(401).json({ success: false, error: 'Invalid API Key' });
  }
  // Mark request as system
  req.user = { userId: null, role: 'system' };
  next();
}
