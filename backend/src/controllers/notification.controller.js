import * as notificationService from '../services/notification.service.js';

export async function list(req, res) {
  res.json({ notifications: await notificationService.list(req.user, req.valid.query) });
}

export async function markRead(req, res) {
  await notificationService.markRead(req.user, req.valid.params.id);
  res.status(204).end();
}

export async function markAllRead(req, res) {
  await notificationService.markAllRead(req.user);
  res.status(204).end();
}
