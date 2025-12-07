export const roleMiddleware = (allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Accès interdit pour ce rôle.' });
  }
  next();
};
