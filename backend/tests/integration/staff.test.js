import fs from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { api, auth, createRestaurantWithOwner, db, registerUser, resetDb } from './helpers.js';

beforeEach(resetDb);
afterAll(async () => {
  await db.destroy();
  await fs.rm(path.resolve('uploads-test'), { recursive: true, force: true });
});

const book = (token, restaurantId, partySize = 2) =>
  api().post(`/api/restaurants/${restaurantId}/queues`).set(auth(token)).send({ partySize }).expect(201);

const action = (token, queueId, act, body = {}) =>
  api().post(`/api/staff/queues/${queueId}/${act}`).set(auth(token)).send(body);

const notificationsOf = async (token) =>
  (await api().get('/api/notifications').set(auth(token)).expect(200)).body.notifications;

describe('staff queue flow', () => {
  it('เรียกคิว → จัดโต๊ะ + แจ้งเตือน near/ready', async () => {
    const { owner, restaurant, tables } = await createRestaurantWithOwner({ nearThreshold: 2 });
    const [a, b, c] = await Promise.all([registerUser(), registerUser(), registerUser()]);
    const qa = (await book(a.token, restaurant.id, 3)).body.queue;
    await book(b.token, restaurant.id);
    await book(c.token, restaurant.id);

    // threshold = 2 → คิว 1, 2 ได้ near / คิว 3 ยังไม่ได้
    expect((await notificationsOf(a.token)).map((n) => n.type)).toEqual(['near']);
    expect(await notificationsOf(c.token)).toHaveLength(0);

    // เรียกคิว 1 → a ได้ ready, c ขยับขึ้นมาอยู่ 2 คิวแรก → ได้ near
    const called = await action(owner.token, qa.id, 'call').expect(200);
    expect(called.body.queue.status).toBe('called');
    expect((await notificationsOf(a.token)).map((n) => n.type)).toEqual(['ready', 'near']);
    expect((await notificationsOf(c.token)).map((n) => n.type)).toEqual(['near']);

    // โต๊ะ A1 นั่งได้ 2 แต่มา 3 คน → 409
    const small = tables.find((t) => t.label === 'A1');
    const big = tables.find((t) => t.label === 'B1');
    expect((await action(owner.token, qa.id, 'seat', { tableId: small.id }).expect(409)).body.error.code).toBe(
      'TABLE_TOO_SMALL',
    );
    await action(owner.token, qa.id, 'seat').expect(400); // ไม่เลือกโต๊ะ

    const seated = await action(owner.token, qa.id, 'seat', { tableId: big.id }).expect(200);
    expect(seated.body.queue).toMatchObject({ status: 'seated', tableLabel: 'B1' });

    const tablesRes = await api().get('/api/staff/tables').set(auth(owner.token)).expect(200);
    const b1 = tablesRes.body.tables.find((t) => t.label === 'B1');
    expect(b1).toMatchObject({ status: 'occupied', currentQueue: { displayNumber: '001', partySize: 3 } });

    const list = await api().get('/api/staff/queues').set(auth(owner.token)).expect(200);
    expect(list.body.queues.map((q) => q.queueNumber)).toEqual([2, 3]);
  });

  it('เปลี่ยนสถานะผิดลำดับ → 409', async () => {
    const { owner, restaurant, tables } = await createRestaurantWithOwner();
    const a = await registerUser();
    const q = (await book(a.token, restaurant.id)).body.queue;
    await action(owner.token, q.id, 'seat', { tableId: tables[0].id }).expect(409); // ยังไม่ได้เรียก
    await action(owner.token, q.id, 'skip').expect(409);
    await action(owner.token, q.id, 'call').expect(200);
    await action(owner.token, q.id, 'skip').expect(200);
    await action(owner.token, q.id, 'call').expect(409);
  });

  it('ร้านอื่นแตะคิวของเราไม่ได้', async () => {
    const { restaurant } = await createRestaurantWithOwner();
    const other = await createRestaurantWithOwner({ name: 'ร้านอื่น' });
    const a = await registerUser();
    const q = (await book(a.token, restaurant.id)).body.queue;
    await action(other.owner.token, q.id, 'call').expect(404);
  });

  it('ลูกค้าเข้า /staff ไม่ได้', async () => {
    const a = await registerUser();
    await api().get('/api/staff/queues').set(auth(a.token)).expect(403);
  });
});

describe('members', () => {
  it('owner เพิ่มพนักงาน → staff ใช้ dashboard ได้แต่สร้างโต๊ะไม่ได้ → ถอดออกแล้วหมดสิทธิ์ทันที', async () => {
    const { owner, restaurant } = await createRestaurantWithOwner();
    const s = await registerUser();

    await api().post('/api/staff/members').set(auth(owner.token)).send({ email: 'nobody@test.dev' }).expect(404);
    const added = await api().post('/api/staff/members').set(auth(owner.token)).send({ email: s.email }).expect(201);
    expect(added.body.member).toMatchObject({ role: 'staff', restaurantId: restaurant.id });

    await api().get('/api/staff/queues').set(auth(s.token)).expect(200); // token เดิมใช้ได้เลย
    await api().post('/api/staff/tables').set(auth(s.token)).send({ label: 'X', capacity: 2 }).expect(403);
    await api().patch(`/api/restaurants/${restaurant.id}`).set(auth(s.token)).send({ isOpen: false }).expect(200);
    await api().patch(`/api/restaurants/${restaurant.id}`).set(auth(s.token)).send({ name: 'แฮ็ก' }).expect(403);

    await api().delete(`/api/staff/members/${s.user.id}`).set(auth(owner.token)).expect(204);
    await api().get('/api/staff/queues').set(auth(s.token)).expect(403);
  });
});

describe('stats', () => {
  it('คืนข้อมูลครบ 7 วัน และ 24 ชั่วโมง', async () => {
    const { owner, restaurant } = await createRestaurantWithOwner();
    const a = await registerUser();
    const q = (await book(a.token, restaurant.id)).body.queue;
    await action(owner.token, q.id, 'call').expect(200);

    const res = await api().get('/api/staff/stats').set(auth(owner.token)).expect(200);
    expect(res.body.daily).toHaveLength(7);
    expect(res.body.hourly).toHaveLength(24);
    expect(res.body.summary.total).toBe(1);
    expect(res.body.daily.at(-1).total).toBe(1);

    await api().get('/api/staff/stats?from=2026-01-10&to=2026-01-01').set(auth(owner.token)).expect(400);
  });
});

describe('image upload (local driver)', () => {
  it('ขอ upload url → อัปโหลด → บันทึก key → ได้ URL รูป', async () => {
    const { owner, restaurant } = await createRestaurantWithOwner();
    const up = await api()
      .post(`/api/restaurants/${restaurant.id}/upload-url`)
      .set(auth(owner.token))
      .send({ type: 'cover', contentType: 'image/png' })
      .expect(200);
    expect(up.body.key).toMatch(new RegExp(`^uploads/restaurants/${restaurant.id}/cover-.+\\.png$`));

    let req = api().post(up.body.url);
    for (const [k, v] of Object.entries(up.body.fields)) req = req.field(k, v);
    await req.attach('file', Buffer.from('fake-png'), { filename: 'a.png', contentType: 'image/png' }).expect(201);

    const patched = await api()
      .patch(`/api/restaurants/${restaurant.id}`)
      .set(auth(owner.token))
      .send({ coverImageKey: up.body.key })
      .expect(200);
    expect(patched.body.restaurant.coverImageUrl).toBe(`/${up.body.key}`);

    const file = await api().get(`/${up.body.key}`).expect(200);
    expect(file.body.toString()).toBe('fake-png');

    // key ของร้านอื่น → 400
    await api()
      .patch(`/api/restaurants/${restaurant.id}`)
      .set(auth(owner.token))
      .send({ coverImageKey: 'uploads/restaurants/999/cover-x.png' })
      .expect(400);
  });

  it('ลายเซ็นผิด → 403', async () => {
    await api()
      .post('/api/dev-uploads')
      .field('key', 'uploads/restaurants/1/x.png')
      .field('Content-Type', 'image/png')
      .field('expires', String(Date.now() + 60_000))
      .field('signature', 'bad')
      .attach('file', Buffer.from('x'), 'x.png')
      .expect(403);
  });
});
