import { db } from '../lib/db.js';

// สถิติ query จากตาราง queues โดยตรง (ข้อมูลระดับนี้ยังไม่ต้อง pre-aggregate)
// created_at เก็บเป็น UTC → แปลงเป็นเวลาท้องถิ่นด้วย CONVERT_TZ ก่อนจัดกลุ่มรายชั่วโมง

export async function summary(restaurantId, from, to) {
  const [rows] = await db.raw(
    `SELECT
       COUNT(*)                                                         AS total,
       COALESCE(SUM(status = 'seated'), 0)                              AS seated,
       COALESCE(SUM(status IN ('cancelled', 'skipped')), 0)             AS dropped,
       AVG(CASE WHEN called_at IS NOT NULL
                THEN TIMESTAMPDIFF(SECOND, created_at, called_at) END) / 60 AS avg_wait_minutes,
       AVG(party_size)                                                  AS avg_party_size
     FROM queues
     WHERE restaurant_id = ? AND queue_date BETWEEN ? AND ?`,
    [restaurantId, from, to],
  );
  return rows[0];
}

export async function daily(restaurantId, from, to) {
  const [rows] = await db.raw(
    `SELECT
       queue_date                                           AS date,
       COUNT(*)                                             AS total,
       COALESCE(SUM(status = 'seated'), 0)                  AS seated,
       COALESCE(SUM(status IN ('cancelled', 'skipped')), 0) AS dropped
     FROM queues
     WHERE restaurant_id = ? AND queue_date BETWEEN ? AND ?
     GROUP BY queue_date
     ORDER BY queue_date`,
    [restaurantId, from, to],
  );
  return rows;
}

export async function hourly(restaurantId, from, to, tzOffset) {
  const [rows] = await db.raw(
    `SELECT
       HOUR(CONVERT_TZ(created_at, '+00:00', ?)) AS hour,
       COUNT(*)                                  AS total,
       AVG(CASE WHEN called_at IS NOT NULL
                THEN TIMESTAMPDIFF(SECOND, created_at, called_at) END) / 60 AS avg_wait_minutes
     FROM queues
     WHERE restaurant_id = ? AND queue_date BETWEEN ? AND ?
     GROUP BY hour
     ORDER BY hour`,
    [tzOffset, restaurantId, from, to],
  );
  return rows;
}
