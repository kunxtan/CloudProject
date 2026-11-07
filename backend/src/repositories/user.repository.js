import { db } from '../lib/db.js';
import { publicUrl } from '../services/storage.service.js';
import { iso } from '../utils/format.js';

export const findById = (id, trx = db) => trx('users').where({ id }).first();

export const findByEmail = (email, trx = db) => trx('users').where({ email }).first();

export async function create(data, trx = db) {
  const [id] = await trx('users').insert(data);
  return id;
}

export const update = (id, patch, trx = db) => trx('users').where({ id }).update(patch);

/** ล็อกแถว user ไว้จนจบ transaction — กันลูกค้ากดจองซ้ำพร้อมกัน (double click) */
export const lockById = (id, trx) => trx('users').where({ id }).forUpdate().first('id');

export const listStaff = (restaurantId) =>
  db('users').where({ restaurant_id: restaurantId, role: 'staff' }).orderBy('name');

export function toPublicUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    avatarUrl: publicUrl(row.avatar_key),
    role: row.role,
    restaurantId: row.restaurant_id,
    createdAt: iso(row.created_at),
  };
}
