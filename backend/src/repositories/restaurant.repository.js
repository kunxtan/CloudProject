import { db } from '../lib/db.js';

function waitingCount(date) {
  return db.raw(
    `(SELECT COUNT(*) FROM queues q
       WHERE q.restaurant_id = restaurants.id AND q.queue_date = ? AND q.status = 'waiting') AS waiting_count`,
    [date],
  );
}

const escapeLike = (s) => s.replace(/[\\%_]/g, '\\$&');

export async function search({ q, limit, offset, date }) {
  const base = db('restaurants');
  if (q) {
    const pattern = `%${escapeLike(q)}%`;
    // ใช้ LIKE ธรรมดา (collation utf8mb4_0900_ai_ci ไม่สนตัวพิมพ์เล็ก/ใหญ่)
    // ห้ามใช้ knex whereLike — มันเติม COLLATE utf8_bin ซึ่งใช้กับ utf8mb4 ไม่ได้
    base.where((b) => b.whereRaw('name LIKE ?', [pattern]).orWhereRaw('address LIKE ?', [pattern]));
  }
  const [{ total }] = await base.clone().count({ total: '*' });
  const rows = await base
    .clone()
    .select('restaurants.*', waitingCount(date))
    .orderBy([
      { column: 'is_open', order: 'desc' },
      { column: 'name', order: 'asc' },
    ])
    .limit(limit)
    .offset(offset);
  return { rows, total: Number(total) };
}

export const findById = (id, date, trx = db) =>
  trx('restaurants').select('restaurants.*', waitingCount(date)).where('restaurants.id', id).first();

export const findRawById = (id, trx = db) => trx('restaurants').where({ id }).first();

export async function create(data, trx = db) {
  const [id] = await trx('restaurants').insert(data);
  return id;
}

export const update = (id, patch, trx = db) => trx('restaurants').where({ id }).update(patch);
