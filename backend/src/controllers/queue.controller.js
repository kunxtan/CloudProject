import * as queueService from '../services/queue.service.js';

export async function book(req, res) {
  res.status(201).json({ queue: await queueService.book(req.user, req.valid.params.id, req.valid.body) });
}

export async function listMine(req, res) {
  res.json({ queues: await queueService.listMine(req.user) });
}

export async function history(req, res) {
  res.json({ queues: await queueService.history(req.user) });
}

export async function cancel(req, res) {
  res.json({ queue: await queueService.cancelByCustomer(req.user, req.valid.params.id) });
}
