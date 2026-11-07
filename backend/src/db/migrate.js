/**
 * รัน migration ทั้งหมดที่ยังไม่ได้รัน
 * - ถูกเรียกตอน container start (ก่อน server.js) ดู Dockerfile
 * - ถ้า EC2 2 เครื่องบูตพร้อมกัน เครื่องหนึ่งจะเจอ "migration table is already locked" → รอแล้วลองใหม่
 * - ถ้า DB ยังไม่พร้อม (เช่น RDS เพิ่ง start) → รอแล้วลองใหม่
 */
import { db } from '../lib/db.js';
import { logger } from '../lib/logger.js';

const MAX_ATTEMPTS = 20;
const RETRYABLE = /already locked|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|PROTOCOL_CONNECTION_LOST/i;

async function main() {
  for (let attempt = 1; ; attempt++) {
    try {
      const [batch, files] = await db.migrate.latest();
      if (files.length) logger.info({ batch, files }, 'migrations applied');
      else logger.info('database schema is up to date');
      return;
    } catch (err) {
      const retryable = RETRYABLE.test(`${err.code ?? ''} ${err.message}`);
      if (!retryable || attempt >= MAX_ATTEMPTS) throw err;
      logger.warn({ attempt, reason: err.code ?? err.message }, 'migration not ready, retrying in 3s');
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

try {
  await main();
} catch (err) {
  logger.fatal({ err }, 'migration failed');
  process.exitCode = 1;
} finally {
  await db.destroy();
}
