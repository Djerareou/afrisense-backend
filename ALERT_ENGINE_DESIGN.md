# AfriSense Alert Engine - Design

This document summarizes the alert engine implemented under `src/engine/alerts/`.

Overview
- Rules are small modules exporting an object with `id`, `description` and `check`.
- Scheduled-capable rules expose `scheduledCheck` which returns items to evaluate.
- The central engine (`alert-engine.js`) loads tracker context (tracker + user alert settings), runs rules and creates alerts via existing `alerts.service`.
- Notifications are delegated to `src/services/notification.service.js` which supports Resend and CallMeBot (SMS/WhatsApp). It falls back to SMTP if configured.

Files
- `src/engine/alerts/*.rule.js` - individual rules (overspeed, geofence-entry/exit, low-battery, offline, no-movement).
- `src/engine/alerts/rules.index.js` - aggregator exposing `RULES`.
- `src/engine/alerts/alert-engine.js` - executor providing `runRulesForPosition`, `runRulesForGeofenceEvent`, `runScheduledRules`.

Integration points
- Positions: `src/modules/positions/positions.service.js` invokes the engine after inserting a position.
- Geofences: `src/modules/geofences/geofences.events.js` invokes the engine after persisting a geofence event.
- Scheduler: `src/scheduler/alerts.scheduler.js` runs `runScheduledRules()` periodically (5/10 minutes)

Design notes
- Non-blocking: rule execution and notifications are invoked in a best-effort, non-blocking manner to avoid slowing ingestion.
- Backwards compatibility: existing `alerts.service.createAlert` behaviour is preserved; the engine uses it to persist alerts and then the notification service to deliver messages.
- Environment-driven thresholds: per-user AlertSetting rows may include `thresholds` JSON and `channels` JSON for delivery.

Next steps
- Add unit tests for each rule and for the engine pipeline.
- Tune scheduled queries for production scale (use pagination and batching).
