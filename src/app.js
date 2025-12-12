// src/app.js
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

import authRoutes from './modules/auth/auth.routes.js';
import trackerRoutes from './modules/trackers/trackers.routes.js';
import positionsRoutes from './modules/positions/positions.routes.js';
import geofenceRoutes from './modules/geofences/geofences.routes.js';
import alertsRoutes from './modules/alerts/alerts.routes.js';
import smsRoutes from './modules/sms/sms.routes.js';
import walletRoutes from './modules/wallet/wallet.routes.js';
import subscriptionRoutes from './modules/subscriptions/subscriptions.routes.js';
import paymentRoutes from './modules/payments/payments.routes.js';

import swaggerUi from 'swagger-ui-express';
import { startAlertSchedulers } from './scheduler/alerts.scheduler.js';

// Charger OpenAPI
const openapiPath = path.join(process.cwd(), 'src', 'docs', 'openapi.json');
const openapi = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));

const app = express();

// Middlewares globaux
app.use(cors());
app.use(express.json());
// Parse application/x-www-form-urlencoded bodies (required for many SMS provider callbacks)
app.use(express.urlencoded({ extended: true }));

// Routes principales
app.use('/api/auth', authRoutes);
app.use('/api/trackers', trackerRoutes);
app.use('/api/positions', positionsRoutes);
app.use('/api/geofences', geofenceRoutes);
app.use('/api/alerts', alertsRoutes);

// Webhooks
app.use('/webhooks', positionsRoutes); // Traccar webhook
app.use('/webhooks/sms', smsRoutes); // SMS webhook

// Swagger UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi));

// Start background schedulers (alerts)
try {
	startAlertSchedulers();
} catch (err) {
	console.error('Failed to start alert schedulers', err);
}


app.use('/api/wallet', walletRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);


export default app;
