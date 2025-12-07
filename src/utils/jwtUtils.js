/**
 * Fonctions utilitaires pour JWT
 */

import jwt from 'jsonwebtoken';

// Use the same default secret as auth.service.js to avoid mismatch in tests
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
// Token expiry set to 10 days per project configuration
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '10d';

export const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};
