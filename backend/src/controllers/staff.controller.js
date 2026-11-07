import * as memberService from '../services/member.service.js';
import * as queueService from '../services/queue.service.js';
import * as restaurantService from '../services/restaurant.service.js';
import * as statsService from '../services/stats.service.js';
import * as tableService from '../services/table.service.js';

export async function myRestaurant(req, res) {
  res.json({ restaurant: await restaurantService.getMine(req.user) });
}

/* queues */
export async function listQueues(req, res) {
  res.json({ queues: await queueService.listForStaff(req.user, { statuses: req.valid.query.status }) });
}

export async function queueAction(req, res) {
  const { id, action } = req.valid.params;
  res.json({ queue: await queueService.staffAction(req.user, id, action, req.valid.body) });
}

/* tables */
export async function listTables(req, res) {
  res.json({ tables: await tableService.list(req.user) });
}

export async function createTable(req, res) {
  res.status(201).json({ table: await tableService.create(req.user, req.valid.body) });
}

export async function updateTable(req, res) {
  res.json({ table: await tableService.update(req.user, req.valid.params.id, req.valid.body) });
}

export async function deleteTable(req, res) {
  await tableService.remove(req.user, req.valid.params.id);
  res.status(204).end();
}

/* stats */
export async function stats(req, res) {
  res.json(await statsService.get(req.user, req.valid.query));
}

/* members */
export async function listMembers(req, res) {
  res.json({ members: await memberService.list(req.user) });
}

export async function addMember(req, res) {
  res.status(201).json({ member: await memberService.add(req.user, req.valid.body) });
}

export async function removeMember(req, res) {
  await memberService.remove(req.user, req.valid.params.id);
  res.status(204).end();
}
