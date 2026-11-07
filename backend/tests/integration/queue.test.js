import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { api, auth, createRestaurantWithOwner, db, registerUser, resetDb } from './helpers.js';

beforeEach(resetDb);
afterAll(() => db.destroy());

const book = (token, restaurantId, partySize = 2) =>
  api().post(`/api/restaurants/${restaurantId}/queues`).set(auth(token)).send({ partySize });

describe('customer queue', () => {
  it('จองคิว → ได้เลขเรียงกัน + ลำดับ + เวลารอ', async () => {
    const { restaurant } = await createRestaurantWithOwner({ avgServiceMinutes: 10 });
    const a = await registerUser();
    const b = await registerUser();

    const qa = (await book(a.token, restaurant.id).expect(201)).body.queue;
    const qb = (await book(b.token, restaurant.id, 4).expect(201)).body.queue;

    expect(qa).toMatchObject({ queueNumber: 1, displayNumber: '001', status: 'waiting', ahead: 0, estWaitMin: 0 });
    expect(qb).toMatchObject({ queueNumber: 2, ahead: 1, estWaitMin: 10, partySize: 4 });

    const mine = await api().get('/api/queues/me').set(auth(b.token)).expect(200);
    expect(mine.body.queues).toHaveLength(1);
    expect(mine.body.queues[0]).toMatchObject({ id: qb.id, restaurantName: 'ร้านทดสอบ', ahead: 1 });

    const r = await api().get(`/api/restaurants/${restaurant.id}`).expect(200);
    expect(r.body.restaurant).toMatchObject({ waitingCount: 2, estWaitMin: 20 });
  });

  it('จองซ้ำร้านเดิม → 409', async () => {
    const { restaurant } = await createRestaurantWithOwner();
    const a = await registerUser();
    await book(a.token, restaurant.id).expect(201);
    const res = await book(a.token, restaurant.id).expect(409);
    expect(res.body.error.code).toBe('ALREADY_IN_QUEUE');
  });

  it('ร้านปิดรับคิว → 409', async () => {
    const { restaurant } = await createRestaurantWithOwner({ isOpen: false });
    const a = await registerUser();
    const res = await book(a.token, restaurant.id).expect(409);
    expect(res.body.error.code).toBe('RESTAURANT_CLOSED');
  });

  it('owner จองคิวไม่ได้ → 403', async () => {
    const { owner, restaurant } = await createRestaurantWithOwner();
    await book(owner.token, restaurant.id).expect(403);
  });

  it('ยกเลิกคิวตัวเองได้ แต่ยกเลิกคิวคนอื่นไม่ได้', async () => {
    const { restaurant } = await createRestaurantWithOwner();
    const a = await registerUser();
    const b = await registerUser();
    const q = (await book(a.token, restaurant.id).expect(201)).body.queue;

    await api().post(`/api/queues/${q.id}/cancel`).set(auth(b.token)).expect(404);
    const res = await api().post(`/api/queues/${q.id}/cancel`).set(auth(a.token)).expect(200);
    expect(res.body.queue.status).toBe('cancelled');
    await api().post(`/api/queues/${q.id}/cancel`).set(auth(a.token)).expect(409); // ยกเลิกซ้ำ

    // ยกเลิกแล้วจองใหม่ได้ ได้เลขถัดไป (ไม่ใช้เลขเดิมซ้ำ)
    const again = (await book(a.token, restaurant.id).expect(201)).body.queue;
    expect(again.queueNumber).toBe(2);
  });
});

describe('restaurant search', () => {
  it('ค้นหาภาษาไทยจากชื่อและที่อยู่ (ไม่สนตัวพิมพ์เล็ก/ใหญ่) + escape อักขระพิเศษ', async () => {
    await createRestaurantWithOwner({ name: 'ชาบูหิวแหลก', address: 'สยามสแควร์' });
    await createRestaurantWithOwner({ name: 'Somtam House', address: 'ลาดกระบัง' });
    await createRestaurantWithOwner({ name: 'ร้าน 100%', address: 'บางนา' });

    const names = async (q) =>
      (await api().get('/api/restaurants').query({ q }).expect(200)).body.items.map((r) => r.name);

    expect(await names('ชาบู')).toEqual(['ชาบูหิวแหลก']);
    expect(await names('สยาม')).toEqual(['ชาบูหิวแหลก']);
    expect(await names('somtam')).toEqual(['Somtam House']);
    expect(await names('%')).toEqual(['ร้าน 100%']);
    expect(await names('')).toHaveLength(3);
  });
});

describe('concurrency', () => {
  it('ลูกค้า 40 คนจองพร้อมกัน → เลขคิวไม่ซ้ำและเรียง 1..40', async () => {
    const { restaurant } = await createRestaurantWithOwner();
    const users = await Promise.all(Array.from({ length: 40 }, () => registerUser()));

    const results = await Promise.all(users.map((u) => book(u.token, restaurant.id)));
    expect(results.map((r) => r.status)).toEqual(Array(40).fill(201));

    const numbers = results.map((r) => r.body.queue.queueNumber).sort((x, y) => x - y);
    expect(numbers).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
  });

  it('ลูกค้าคนเดียวกดจองรัว 5 ครั้งพร้อมกัน → สำเร็จแค่ 1', async () => {
    const { restaurant } = await createRestaurantWithOwner();
    const a = await registerUser();
    const results = await Promise.all(Array.from({ length: 5 }, () => book(a.token, restaurant.id)));
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409, 409, 409, 409]);
  });
});
