// Middleware to enforce allowed roles on routes
export const roleMiddleware = (allowedRoles = []) => (req, res, next) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Missing user' });
  if (!allowedRoles || allowedRoles.length === 0) return next();
  if (!allowedRoles.includes(user.role)) return res.status(403).json({ error: 'Forbidden' });
  return next();
};
