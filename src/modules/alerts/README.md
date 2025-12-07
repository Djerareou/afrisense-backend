# Alerts module

This module implements alert creation, listing, user settings and delivery logging for AfriSense.

## Files

- `alerts.enums.js` — alert types, severities and channels.
- `alerts.repository.js` — Prisma DB access (createAlert, findAlerts, updateAlertStatus, get/update settings, createDeliveryLog).
- `alerts.service.js` — business logic: validation, ownership checks, settings enforcement, notification sending and delivery logging.
- `alerts.controller.js` — Express handlers for API endpoints.
- `alerts.routes.js` — Express router mounted at `/api/alerts`.
- `notifications.js` — simple provider abstraction (nodemailer when SMTP configured, console fallback).

## API

- POST `/api/alerts` — create an alert (body must include `userId`, `trackerId`, `positionId`, `type`, `severity`).
- GET `/api/alerts` — list alerts. Supports `type`, `severity`, `trackerId`, `geofenceId`, `dateFrom`, `dateTo`, `skip`, `take` as query params.
- PATCH `/api/alerts/:id/status` — update an alert's status (requires authenticated user ownership).
- GET `/api/alerts/settings` — get current user's alert settings.
- PATCH `/api/alerts/settings` — update current user's alert settings.

## Behavior & Integrations

- Geofence events call into `createAlert()` when enter/exit events are detected.
- Positions ingestion will create OVERSPEED or BATTERY_LOW alerts when thresholds are exceeded (user settings respected).
- Alerts are best-effort: notification sending is performed asynchronously and failures do not block ingestion.

## Persistence

Alerts are persisted in the `Alert` model. Each delivery attempt is recorded in `AlertDeliveryLog`.

## Tests

Unit tests for alerts are under `src/test/unit/`:

- `alerts.service.unit.test.js` — basic create + delivery log behavior.
- `alerts.settings.unit.test.js` — settings update and disabled behavior.

## Configuration

To enable SMTP email sending provide these env vars:

```
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
SMTP_FROM
```

If SMTP is not configured the module falls back to writing the notification to the application logger.

## Notes

- `positionId` is required for all alerts created by the service.
- This module intentionally does not directly depend on WebSockets; you can add a separate delivery pipeline to broadcast alerts to live clients.

