import express from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import paymentsCtrl from './payments.controller.js';

const router = express.Router();
router.use(authMiddleware);

router.post('/simulate/mobile', paymentsCtrl.simulateMobileController);
router.post('/simulate/card', paymentsCtrl.simulateCardController);

export default router;
