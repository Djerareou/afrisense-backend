import express from 'express';
import { registerUser, loginUser, getUserProfile } from './auth.service.js';
import { authMiddleware } from './auth.middleware.js';
import { registerSchema, loginSchema } from './auth.validation.js';

const router = express.Router();

const validate = (schema, data) => {
  const { error } = schema.validate(data);
  if (error) throw new Error(error.details[0].message);
};

// Routes
router.post('/register', async (req, res) => {
  try {
    validate(registerSchema, req.body);
    const user = await registerUser(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    validate(loginSchema, req.body);
    const result = await loginUser(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(401).json({ success: false, error: err.message });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await getUserProfile(req.user.userId);
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
});

export { router as authController };
