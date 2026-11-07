import { db } from '../lib/db.js';

export const ACTIVE_STATUSES = ['waiting', 'called'];

// จำนวนคิวที่ "รอ" อยู่ก่อนหน้าคิวนี้ (ร้านเดียวกัน วันเดียวกัน) — ใช้ index restaurant/date/status
const AHEAD_SQL = `(SELECT COUNT(*) FROM queues q2
   WHERE q2.restaurant_id = queues.restaurant_id
     AND q2.queue_date = queues.queue_date
     AND q2.status = 'waiting'
     AND q2.queue_number < queues.queue_number) AS ahead`;

/** query พื้นฐานที่ join ข้อมูลที่ต้องแสดงผลมาครบ */
function detailed(trx = db) {
  return trx('queues')
    .join('restaurants as r', 'r.id', 'queues.restaurant_id')
    .join('users as u', 'u.id', 'queues.customer_id')
    .leftJoin('restaurant_tables as t', 't.id', 'queues.table_id')
    .select(
      'queues.*',
      'r.name as restaurant_name',
      'r.avg_service_minutes',
      'u.name as customer_name',
      'u.phone as customer_phone',
      't.label as table_label',
      db.raw(AHEAD_SQL),
    );
}

/**
 * ออกเลขคิวถัดไปแบบ atomic
 * - ถ้ายังไม่มีแถวของวันนี้ → INSERT เป็น 1
 * - ถ้ามีแล้ว → UPDATE เป็น last_number + 1
 * LAST_INSERT_ID(expr) จำค่าไว้ "ต่อ connection" จึงไม่ปนกับ request อื่น
 * และ row lock ของ counter ทำให้ transaction ที่จองร้านเดียวกันต้องต่อคิวกันเอง
 */
export async function nextNumber(trx, restaurantId, date) {
  await trx.raw(
    `INSERT INTO queue_counters (restaurant_id, queue_date, last_number)
     VALUES (?, ?, LAST_INSERT_ID(1))
     ON DUPLICATE KEY UPDATE last_number = LAST_INSERT_ID(last_number + 1)`,
    [restaurantId, date],
  );
  const [rows] = await trx.raw('SELECT LAST_INSERT_ID() AS n');
  return Number(rows[0].n);
}

export async function insert(trx, data) {
  const [id] = await trx('queues').insert(data);
  return id;
}

export function findById(id, trx = db, { forUpdate = false } = {}) {
  const q = trx('queues').where({ id }).first();
  return forUpdate ? q.forUpdate() : q;
}

export const findDetailedById = (id, trx = db) => detailed(trx).where('queues.id', id).first();

export const findActiveForCustomer = (trx, customerId, restaurantId, date) =>
  trx('queues')
    .where({ customer_id: customerId, restaurant_id: restaurantId, queue_date: date })
    .whereIn('status', ACTIVE_STATUSES)
    .first('id');

export const listActiveByCustomer = (customerId, date) =>
  detailed()
    .where({ 'queues.customer_id': customerId, 'queues.queue_date': date })
    .whereIn('queues.status', ACTIVE_STATUSES)
    .orderBy('queues.created_at', 'desc');

export const listHistoryByCustomer = (customerId, limit = 50) =>
  detailed()
    .where('queues.customer_id', customerId)
    .orderBy('queues.created_at', 'desc')
    .limit(limit);

export const listForRestaurant = (restaurantId, date, statuses) =>
  detailed()
    .where({ 'queues.restaurant_id': restaurantId, 'queues.queue_date': date })
    .whereIn('queues.status', statuses)
    .orderBy('queues.queue_number', 'asc');

export const update = (id, patch, trx = db) => trx('queues').where({ id }).update(patch);

/** N คิวแรกที่ยังรออยู่ (ใช้หาว่าใครควรได้แจ้งเตือน "ใกล้ถึงคิว") */
export const firstWaiting = (restaurantId, date, limit, trx = db) =>
  trx('queues')
    .where({ restaurant_id: restaurantId, queue_date: date, status: 'waiting' })
    .orderBy('queue_number', 'asc')
    .limit(limit)
    .select('id', 'customer_id', 'queue_number');
