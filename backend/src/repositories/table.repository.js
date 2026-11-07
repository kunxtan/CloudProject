import { db } from '../lib/db.js';

export const list = (restaurantId) =>
  db('restaurant_tables').where({ restaurant_id: restaurantId }).orderBy('label', 'asc');

export function findById(id, trx = db, { forUpdate = false } = {}) {
  const q = trx('restaurant_tables').where({ id }).first();
  return forUpdate ? q.forUpdate() : q;
}

export async function create(data, trx = db) {
  const [id] = await trx('restaurant_tables').insert(data);
  return id;
}

export const update = (id, patch, trx = db) => trx('restaurant_tables').where({ id }).update(patch);

export const remove = (id, trx = db) => trx('restaurant_tables').where({ id }).delete();
