import path from 'node:path';
import { fileURLToPath } from 'node:url';
import knex from 'knex';
import { env } from '../config/env.js';

const here = path.dirname(fileURLToPath(import.meta.url));

const connection = {
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  timezone: 'Z', // เก็บ DATETIME เป็น UTC เสมอ
  dateStrings: ['DATE'], // คอลัมน์ DATE คืนเป็น 'YYYY-MM-DD' ไม่แปลงเป็น Date (กัน timezone เพี้ยน)
  decimalNumbers: true, // SUM/AVG คืนเป็น number ไม่ใช่ string
};
if (env.DB_SSL === 'rds') {
  // mysql2 มี CA ของ Amazon RDS ติดมาให้แล้ว
  connection.ssl = 'Amazon RDS';
}

export const db = knex({
  client: 'mysql2',
  connection,
  pool: {
    min: 0,
    max: env.DB_POOL_MAX,
    // ทุก connection ใช้ UTC ให้ตรงกับ timezone: 'Z' ด้านบน (CURRENT_TIMESTAMP จะได้ตรงกัน)
    afterCreate(conn, done) {
      conn.query("SET time_zone = '+00:00'", (err) => done(err, conn));
    },
  },
  migrations: {
    directory: path.join(here, '../db/migrations'),
    tableName: 'knex_migrations',
    loadExtensions: ['.js'],
  },
});

const RETRYABLE = new Set(['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT']);

/**
 * ลองใหม่อัตโนมัติถ้าเจอ deadlock / lock wait timeout
 * (เกิดได้เมื่อมีการจองคิวพร้อมกันจำนวนมาก — MySQL จะยกเลิกฝั่งหนึ่งแล้วให้เรา retry)
 * fn ต้อง "ทำซ้ำได้ปลอดภัย" เช่น ทั้ง transaction หรือ INSERT IGNORE
 */
export async function retryOnLock(fn, { retries = 4 } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!RETRYABLE.has(err.code) || attempt > retries) throw err;
      await new Promise((r) => setTimeout(r, 20 * attempt + Math.random() * 40));
    }
  }
}

export const withTransaction = (fn, opts) => retryOnLock(() => db.transaction(fn), opts);
