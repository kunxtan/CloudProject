import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, auth, db, registerUser, resetDb } from './helpers.js';

beforeAll(resetDb);
afterAll(() => db.destroy());

describe('auth', () => {
  it('สมัคร → ได้ token → เรียก /me ได้', async () => {
    const { token, user } = await registerUser('customer', { email: 'Alice@Example.com' });
    expect(user).toMatchObject({ email: 'alice@example.com', role: 'customer', restaurantId: null });
    expect(user).not.toHaveProperty('password_hash');

    const me = await api().get('/api/auth/me').set(auth(token)).expect(200);
    expect(me.body.user.id).toBe(user.id);
  });

  it('อีเมลซ้ำ → 409', async () => {
    await registerUser('customer', { email: 'dup@test.dev' });
    const res = await api()
      .post('/api/auth/register')
      .send({ email: 'dup@test.dev', password: 'password123', name: 'x' })
      .expect(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('สมัครเป็น staff เองไม่ได้', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ email: 'staff@test.dev', password: 'password123', name: 'x', role: 'staff' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('รหัสผ่านสั้นเกินไป → 400 พร้อมข้อความภาษาไทย', async () => {
    const res = await api().post('/api/auth/register').send({ email: 'a@b.co', password: '123', name: 'x' }).expect(400);
    expect(res.body.error.message).toContain('8');
  });

  it('login ถูก → 200, ผิด → 401', async () => {
    await registerUser('customer', { email: 'bob@test.dev' });
    await api().post('/api/auth/login').send({ email: 'bob@test.dev', password: 'password123' }).expect(200);
    const res = await api().post('/api/auth/login').send({ email: 'bob@test.dev', password: 'wrong-pass' }).expect(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    await api().post('/api/auth/login').send({ email: 'nobody@test.dev', password: 'password123' }).expect(401);
  });

  it('ไม่มี token / token ปลอม → 401', async () => {
    await api().get('/api/auth/me').expect(401);
    await api().get('/api/auth/me').set(auth('not-a-jwt')).expect(401);
  });

  it('health check', async () => {
    await api().get('/api/health').expect(200);
    const ready = await api().get('/api/health/ready').expect(200);
    expect(ready.body.db).toBe('up');
  });
});

describe('profile (/auth/me)', () => {
  it('แก้ชื่อ/เบอร์ได้ และเบอร์ว่าง = ลบเบอร์', async () => {
    const { token } = await registerUser('customer');
    const res = await api().patch('/api/auth/me').set(auth(token)).send({ name: '  น้องชานม  ', phone: '0899999999' }).expect(200);
    expect(res.body.user).toMatchObject({ name: 'น้องชานม', phone: '0899999999', avatarUrl: null });

    const cleared = await api().patch('/api/auth/me').set(auth(token)).send({ phone: '' }).expect(200);
    expect(cleared.body.user.phone).toBeNull();
  });

  it('เปลี่ยน role / email ตัวเองไม่ได้ (strict body)', async () => {
    const { token, user } = await registerUser('customer');
    await api().patch('/api/auth/me').set(auth(token)).send({ role: 'owner' }).expect(400);
    await api().patch('/api/auth/me').set(auth(token)).send({ email: 'x@x.dev' }).expect(400);
    const me = await api().get('/api/auth/me').set(auth(token)).expect(200);
    expect(me.body.user).toMatchObject({ role: 'customer', email: user.email });
  });

  it('upload url อยู่ใต้ path ของตัวเอง → บันทึก avatarKey ได้, key ของคนอื่นไม่ได้', async () => {
    const a = await registerUser('customer');
    const b = await registerUser('customer');

    const up = await api().post('/api/auth/me/avatar-upload-url').set(auth(a.token)).send({ contentType: 'image/png' }).expect(200);
    expect(up.body.key).toMatch(new RegExp(`^uploads/users/${a.user.id}/avatar-.+\.png$`));

    const saved = await api().patch('/api/auth/me').set(auth(a.token)).send({ avatarKey: up.body.key }).expect(200);
    expect(saved.body.user.avatarUrl).toContain(up.body.key);

    // b พยายามใช้รูปของ a / path traversal
    await api().patch('/api/auth/me').set(auth(b.token)).send({ avatarKey: up.body.key }).expect(400);
    await api().patch('/api/auth/me').set(auth(b.token)).send({ avatarKey: `uploads/users/${b.user.id}/../${a.user.id}/x.png` }).expect(400);

    // ลบรูป
    const removed = await api().patch('/api/auth/me').set(auth(a.token)).send({ avatarKey: null }).expect(200);
    expect(removed.body.user.avatarUrl).toBeNull();
  });

  it('ชนิดไฟล์ที่ไม่รองรับ → 400', async () => {
    const { token } = await registerUser('customer');
    await api().post('/api/auth/me/avatar-upload-url').set(auth(token)).send({ contentType: 'image/gif' }).expect(400);
  });

  it('ไม่ login → 401', async () => {
    await api().patch('/api/auth/me').send({ name: 'x' }).expect(401);
  });
});
