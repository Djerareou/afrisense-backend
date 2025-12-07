import * as service from './alerts.service.js';

export async function createAlertHandler(req, res) {
  const payload = req.body;
  try {
    const userId = req.user?.id || payload.userId;
    const result = await service.createAlert({ ...payload, userId });
    if (!result) return res.status(204).send();
    return res.status(201).json(result);
  } catch (err) {
    return res.status(400).json({ error: String(err) });
  }
}

export async function listAlertsHandler(req, res) {
  const filter = { ...req.query };
  const skip = parseInt(req.query.skip || '0', 10);
  const take = parseInt(req.query.take || '50', 10);
  try {
    filter.userId = req.user?.id || filter.userId;
    const items = await service.getAlerts(filter, { skip, take });
    return res.json(items);
  } catch (err) {
    return res.status(400).json({ error: String(err) });
  }
}

export async function updateAlertStatusHandler(req, res) {
  const id = req.params.id;
  const { status } = req.body;
  try {
    const userId = req.user?.id;
    const updated = await service.updateAlertStatus(id, userId, status);
    return res.json(updated);
  } catch (err) {
    return res.status(400).json({ error: String(err) });
  }
}

export async function getSettingsHandler(req, res) {
  try {
    const userId = req.user?.id;
    const settings = await service.getAlertSettings(userId);
    return res.json(settings);
  } catch (err) {
    return res.status(400).json({ error: String(err) });
  }
}

export async function updateSettingsHandler(req, res) {
  try {
    const userId = req.user?.id;
    const updated = await service.updateAlertSettings(userId, req.body);
    return res.json(updated);
  } catch (err) {
    return res.status(400).json({ error: String(err) });
  }
}
