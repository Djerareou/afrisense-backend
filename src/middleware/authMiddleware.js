/**
 * Middleware pour sécuriser les routes avec JWT
 */

import { verifyToken } from '../utils/jwtUtils.js';

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing token' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token);
    req.user = decoded; // { userId, role }
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
