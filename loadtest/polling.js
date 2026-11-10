// k6 load test: จำลองลูกค้าเปิดหน้า "คิวของฉัน" ค้างไว้ (poll ทุก 5 วินาที เหมือน frontend จริง)
//
//   k6 run -e BASE_URL=https://xxxx.cloudfront.net loadtest/polling.js
//   k6 run -e BASE_URL=... -e USERS=100 -e HOLD=2m loadtest/polling.js   (รอบเบาๆ)
//
// ผ่านเมื่อ: error < 1% และ p95 < 300ms (วัดจากเครื่องเรา → รวมเวลาอินเทอร์เน็ตบ้านด้วย)
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL;
const USERS = Number(__ENV.USERS ?? 500);
const HOLD = __ENV.HOLD ?? '5m';

if (!BASE_URL) throw new Error('ต้องใส่ -e BASE_URL=https://xxxx.cloudfront.net');

export const options = {
  stages: [
    { duration: '1m', target: USERS }, // ค่อยๆ เพิ่มผู้ใช้
    { duration: HOLD, target: USERS }, // ค้างไว้ — ช่วงนี้ทำ failover / deploy test
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<300'],
  },
};

// login ครั้งเดียวแล้วแชร์ token (endpoint login มี rate limit 10 ครั้ง/นาที/IP)
export function setup() {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: 'customer@hiwlaewq.dev', password: 'password123' }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  if (res.status !== 200) throw new Error(`login ไม่สำเร็จ: ${res.status} ${res.body}`);
  return { token: res.json('token') };
}

export default function ({ token }) {
  const params = { headers: { Authorization: `Bearer ${token}` } };

  const responses = http.batch([
    ['GET', `${BASE_URL}/api/queues/me`, null, { ...params, tags: { name: 'queues/me' } }],
    ['GET', `${BASE_URL}/api/notifications?unread=true`, null, { ...params, tags: { name: 'notifications' } }],
  ]);
  for (const r of responses) check(r, { 'status 200': (x) => x.status === 200 });

  sleep(5);
}
