import cron from 'node-cron';
import alertEngine from '../engine/alerts/alert-engine.js';

export function startAlertSchedulers() {
  // offline devices every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      await alertEngine.runScheduledRules();
    } catch (err) {
      console.error('Alert scheduler (offline) failed', err);
    }
  });

  // no movement every 10 minutes (the scheduled rule is part of runScheduledRules)
  cron.schedule('*/10 * * * *', async () => {
    try {
      await alertEngine.runScheduledRules();
    } catch (err) {
      console.error('Alert scheduler (no-movement) failed', err);
    }
  });
}

export default { startAlertSchedulers };
