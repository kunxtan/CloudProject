import request from 'supertest';
import { createApp } from '../../src/app.js';
import { db } from '../../src/lib/db.js';

export const app = createApp();
export const api = () => request(app);

export async function resetDb() {
  await db.migrate.latest();
  await db('notifications').delete();
  await db('queues').delete();
  await db('queue_counters').delete();
  await db('restaurant_tables').delete();
  await db('users').update({ restaurant_id: null });
  await db('restaurants').delete();
  await db('users').delete();
}

let seq = 0;
export async function registerUser(role = 'customer', overrides = {}) {
  seq += 1;
  const body = {
    email: `user${seq}-${Date.now()}@test.dev`,
    password: 'password123',
    name: `Test User ${seq}`,
    phone: '0812345678',
    role,
    ...overrides,
  };
  const res = await api().post('/api/auth/register').send(body).expect(201);
  return { token: res.body.token, user: res.body.user, email: body.email };
}

export const auth = (token) => ({ Authorization: `Bearer ${token}` });

/** owner + ร้าน + โต๊ะ พร้อมใช้งาน */
export async function createRestaurantWithOwner({ tables = [['A1', 2], ['B1', 4]], ...data } = {}) {
  const owner = await registerUser('owner');
  const res = await api()
    .post('/api/restaurants')
    .set(auth(owner.token))
    .send({ name: 'ร้านทดสอบ', avgServiceMinutes: 10, nearThreshold: 2, ...data })
    .expect(201);
  const restaurant = res.body.restaurant;
  const createdTables = [];
  for (const [label, capacity] of tables) {
    const t = await api().post('/api/staff/tables').set(auth(owner.token)).send({ label, capacity }).expect(201);
    createdTables.push(t.body.table);
  }
  return { owner, restaurant, tables: createdTables };
}

export { db };
