import { db } from '../lib/db.js';

/** INSERT IGNORE — ถ้า (queue_id, type) มีอยู่แล้วจะข้ามไป จึงเรียกซ้ำได้ปลอดภัย (idempotent) */
export async function insertIgnore(rows, trx = db) {
  if (!rows.length) return;
  await trx('notifications').insert(rows).onConflict(['queue_id', 'type']).ignore();
}

export async function existingQueueIds(queueIds, type, trx = db) {
  if (!queueIds.length) return new Set();
  const rows = await trx('notifications').whereIn('queue_id', queueIds).andWhere({ type }).select('queue_id');
  return new Set(rows.map((r) => r.queue_id));
}

export function list(userId, { unreadOnly = false, limit = 30 } = {}) {
  const q = db('notifications').where({ user_id: userId }).orderBy('id', 'desc').limit(limit);
  if (unreadOnly) q.andWhere({ is_read: false });
  return q;
}

export const markRead = (userId, id) => db('notifications').where({ id, user_id: userId }).update({ is_read: true });

export const markAllRead = (userId) =>
  db('notifications').where({ user_id: userId, is_read: false }).update({ is_read: true });
