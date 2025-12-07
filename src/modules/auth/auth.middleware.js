import jwt from 'jsonwebtoken';
import { AuthMessages } from './messages.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ success: false, error: AuthMessages.UNAUTHORIZED });

  const token = header.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: AuthMessages.UNAUTHORIZED });
  }
};
