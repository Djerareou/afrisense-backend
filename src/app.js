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

import swaggerUi from 'swagger-ui-express';
import { startAlertSchedulers } from './scheduler/alerts.scheduler.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Charger OpenAPI
const openapiPath = path.join(process.cwd(), 'src', 'docs', 'openapi.json');
const openapi = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));

const app = express();

// Middlewares globaux
app.use(cors());
app.use(express.json());

// Routes principales
app.use('/api/auth', authRoutes);
app.use('/api/trackers', trackerRoutes);
app.use('/api/positions', positionsRoutes);
app.use('/api/geofences', geofenceRoutes);
app.use('/api/alerts', alertsRoutes);

// Webhooks (le fichier positions.routes gère déjà /webhook/traccar)
app.use('/webhooks', positionsRoutes);

// Swagger UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi));

// Start background schedulers (alerts)
try {
	startAlertSchedulers();
} catch (err) {
	console.error('Failed to start alert schedulers', err);
}

// Error handling - must be last
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
