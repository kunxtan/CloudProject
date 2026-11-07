/**
 * ข้อมูลตัวอย่างสำหรับ dev / เดโม
 *   npm run seed            (ล้างข้อมูลเดิมทั้งหมดก่อน!)
 *
 * บัญชีทั้งหมดใช้รหัสผ่าน: password123
 *   owner1@hiwlaewq.dev … owner4@   เจ้าของร้าน 1–4
 *   staff@hiwlaewq.dev              พนักงานร้าน "ชาบูหิวแหลก"
 *   customer@hiwlaewq.dev           ลูกค้า (ยังไม่มีคิววันนี้ — ลองจองได้เลย)
 */
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { db } from '../lib/db.js';
import { addDays, businessDate } from '../lib/time.js';

if (env.isProd && !process.argv.includes('--force')) {
  console.error('ห้ามรัน seed บน production (ถ้าตั้งใจจริงให้ใส่ --force)');
  process.exit(1);
}

// random แบบกำหนด seed ได้ → ได้ข้อมูลเหมือนเดิมทุกครั้ง
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261107);
const randInt = (min, max) => min + Math.floor(rand() * (max - min + 1));
const pick = (weights) => {
  const total = weights.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [value, w] of weights) if ((r -= w) < 0) return value;
  return weights.at(-1)[0];
};

const localTime = (date, hour, minute) =>
  new Date(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00${env.APP_TZ_OFFSET}`);
const plusMinutes = (d, m) => new Date(d.getTime() + m * 60_000);

// คนเยอะช่วงเที่ยงกับเย็น
const HOUR_WEIGHTS = [
  [10, 1], [11, 5], [12, 8], [13, 4], [14, 1], [15, 1], [16, 2], [17, 5], [18, 8], [19, 7], [20, 3], [21, 1],
];

const RESTAURANTS = [
  {
    name: 'ข้าวมันไก่เจ๊หมวย',
    description: 'ข้าวมันไก่ต้มและไก่ทอดสูตรต้นตำรับ น้ำจิ้มเต้าเจี้ยวรสเด็ด เปิดมากว่า 30 ปี',
    address: 'ซอยสุขุมวิท 38 แขวงพระโขนง กรุงเทพฯ',
    avg: 8,
    open: true,
    perDay: [20, 40],
  },
  {
    name: 'ชาบูหิวแหลก',
    description: 'ชาบูบุฟเฟ่ต์น้ำซุป 4 แบบ เนื้อวากิวสไลซ์ ไม่จำกัดเวลา',
    address: 'สยามสแควร์ ซอย 5 เขตปทุมวัน กรุงเทพฯ',
    avg: 25,
    open: true,
    perDay: [25, 45],
  },
  {
    name: 'ส้มตำนัวร์',
    description: 'ส้มตำปูปลาร้า ไก่ย่างเขาสวนกวาง ลาบหมู อาหารอีสานแท้',
    address: 'ถนนฉลองกรุง ลาดกระบัง กรุงเทพฯ',
    avg: 15,
    open: true,
    perDay: [15, 30],
  },
  {
    name: 'หมูกระทะลุงชัย',
    description: 'หมูกระทะเตาถ่าน น้ำจิ้มสูตรเด็ด บรรยากาศริมทาง',
    address: 'ถนนพหลโยธิน จตุจักร กรุงเทพฯ',
    avg: 30,
    open: false,
    perDay: [10, 25],
  },
];

const TABLES = [
  ['A1', 2], ['A2', 2], ['A3', 2], ['A4', 2],
  ['B1', 4], ['B2', 4], ['B3', 4], ['B4', 4],
  ['C1', 6], ['C2', 8],
];

const FIRST_NAMES = ['สมชาย', 'สมหญิง', 'วิชัย', 'มาลี', 'ธนา', 'ปิยะ', 'อรุณ', 'กมล', 'สุดา', 'ณัฐ', 'พิมพ์', 'ภูมิ', 'ฟ้า', 'ต้น', 'แพร', 'บอส', 'มิ้นท์', 'เจ', 'ออม', 'โอ๊ต'];

async function clearAll(trx) {
  await trx('notifications').delete();
  await trx('queues').delete();
  await trx('queue_counters').delete();
  await trx('restaurant_tables').delete();
  await trx('users').update({ restaurant_id: null });
  await trx('restaurants').delete();
  await trx('users').delete();
}

async function main() {
  await db.migrate.latest();
  const today = businessDate();
  const now = new Date();
  const passwordHash = await bcrypt.hash('password123', 10);

  await db.transaction(async (trx) => {
    await clearAll(trx);

    // ── users ──
    const ownerIds = [];
    for (let i = 0; i < RESTAURANTS.length; i++) {
      const [id] = await trx('users').insert({
        email: `owner${i + 1}@hiwlaewq.dev`,
        password_hash: passwordHash,
        name: `เจ้าของร้าน ${RESTAURANTS[i].name}`,
        phone: `08100000${i + 1}0`,
        role: 'owner',
      });
      ownerIds.push(id);
    }
    const [mainCustomerId] = await trx('users').insert({
      email: 'customer@hiwlaewq.dev',
      password_hash: passwordHash,
      name: 'ลูกค้าทดลอง',
      phone: '0899999999',
      role: 'customer',
    });
    const customerIds = [];
    for (let i = 0; i < FIRST_NAMES.length; i++) {
      const [id] = await trx('users').insert({
        email: `c${i + 1}@hiwlaewq.dev`,
        password_hash: passwordHash,
        name: `คุณ${FIRST_NAMES[i]}`,
        phone: `0890000${String(i + 1).padStart(3, '0')}`,
        role: 'customer',
      });
      customerIds.push(id);
    }

    // ── restaurants + tables ──
    const restaurantIds = [];
    for (let i = 0; i < RESTAURANTS.length; i++) {
      const r = RESTAURANTS[i];
      const [id] = await trx('restaurants').insert({
        owner_id: ownerIds[i],
        name: r.name,
        description: r.description,
        address: r.address,
        is_open: r.open,
        avg_service_minutes: r.avg,
        near_threshold: 3,
      });
      restaurantIds.push(id);
      await trx('users').where({ id: ownerIds[i] }).update({ restaurant_id: id });
      await trx('restaurant_tables').insert(
        TABLES.map(([label, capacity]) => ({ restaurant_id: id, label, capacity, status: 'available' })),
      );
    }

    await trx('users').insert({
      email: 'staff@hiwlaewq.dev',
      password_hash: passwordHash,
      name: 'พนักงานชาบู',
      phone: '0812345678',
      role: 'staff',
      restaurant_id: restaurantIds[1],
    });

    // ── ประวัติคิวย้อนหลัง 14 วัน (สำหรับหน้าสถิติ) ──
    const queues = [];
    const counters = [];
    for (let r = 0; r < RESTAURANTS.length; r++) {
      for (let back = 14; back >= 1; back--) {
        const date = addDays(today, -back);
        const count = randInt(...RESTAURANTS[r].perDay);
        const times = Array.from({ length: count }, () => localTime(date, pick(HOUR_WEIGHTS), randInt(0, 59))).sort(
          (a, b) => a - b,
        );
        times.forEach((createdAt, i) => {
          const hour = Number(createdAt.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Bangkok' }));
          const busy = HOUR_WEIGHTS.find(([h]) => h === hour)?.[1] ?? 1;
          const status = pick([['seated', 80], ['cancelled', 12], ['skipped', 8]]);
          const calledAt = status === 'cancelled' && rand() < 0.6 ? null : plusMinutes(createdAt, randInt(3, 6) * busy + randInt(0, 10));
          queues.push({
            restaurant_id: restaurantIds[r],
            customer_id: customerIds[randInt(0, customerIds.length - 1)],
            queue_date: date,
            queue_number: i + 1,
            party_size: pick([[1, 2], [2, 5], [3, 3], [4, 4], [5, 1], [6, 1]]),
            status,
            created_at: createdAt,
            called_at: calledAt,
            seated_at: status === 'seated' ? plusMinutes(calledAt, randInt(1, 5)) : null,
            ended_at: status !== 'seated' ? plusMinutes(calledAt ?? createdAt, randInt(5, 20)) : null,
          });
        });
        counters.push({ restaurant_id: restaurantIds[r], queue_date: date, last_number: count });
      }
    }

    // ── วันนี้: ร้านชาบูมีคิวรออยู่ เพื่อให้ dashboard มีข้อมูล ──
    const shabuId = restaurantIds[1];
    const todayQueues = [
      { c: 0, size: 4, status: 'seated', mins: 70, table: 'B1' },
      { c: 1, size: 2, status: 'seated', mins: 55, table: 'A1' },
      { c: 2, size: 3, status: 'called', mins: 40 },
      { c: 3, size: 2, status: 'waiting', mins: 32 },
      { c: 4, size: 5, status: 'waiting', mins: 25 },
      { c: 5, size: 4, status: 'waiting', mins: 18 },
      { c: 6, size: 2, status: 'waiting', mins: 9 },
      { c: 7, size: 6, status: 'waiting', mins: 3 },
    ];
    const tables = await trx('restaurant_tables').where({ restaurant_id: shabuId });
    const tableId = (label) => tables.find((t) => t.label === label).id;
    todayQueues.forEach((q, i) => {
      const createdAt = plusMinutes(now, -q.mins);
      queues.push({
        restaurant_id: shabuId,
        customer_id: customerIds[q.c],
        queue_date: today,
        queue_number: i + 1,
        party_size: q.size,
        status: q.status,
        table_id: q.table ? tableId(q.table) : null,
        created_at: createdAt,
        called_at: q.status !== 'waiting' ? plusMinutes(createdAt, 15) : null,
        seated_at: q.status === 'seated' ? plusMinutes(createdAt, 18) : null,
      });
    });
    counters.push({ restaurant_id: shabuId, queue_date: today, last_number: todayQueues.length });
    await trx('restaurant_tables').whereIn('id', [tableId('B1'), tableId('A1')]).update({ status: 'occupied' });

    for (let i = 0; i < queues.length; i += 500) await trx('queues').insert(queues.slice(i, i + 500));
    await trx('queue_counters').insert(counters);

    console.log(`✅ seed เสร็จ: ${RESTAURANTS.length} ร้าน, ${customerIds.length + 1} ลูกค้า, ${queues.length} คิว`);
    console.log(`   ลูกค้าหลัก id=${mainCustomerId} → customer@hiwlaewq.dev / password123`);
  });
}

try {
  await main();
} catch (err) {
  console.error('❌ seed ล้มเหลว:', err);
  process.exitCode = 1;
} finally {
  await db.destroy();
}
