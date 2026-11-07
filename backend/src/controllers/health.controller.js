import { db } from '../lib/db.js';

/**
 * Liveness — ALB ใช้ตัวนี้ ตั้งใจ "ไม่เช็ค DB"
 * ถ้าเช็ค DB แล้ว DB ล่ม → ALB จะมองว่าทุกเครื่องเสีย → ASG ลบเครื่องทิ้งวนไปเรื่อยๆ ทั้งที่เครื่องไม่ได้ผิด
 */
export function live(_req, res) {
  res.json({ status: 'ok', uptime: Math.round(process.uptime()) });
}

/** Readiness — เช็คว่าต่อ DB ได้ (ใช้ตอน debug / monitoring) */
export async function ready(_req, res) {
  try {
    await db.raw('SELECT 1');
    res.json({ status: 'ok', db: 'up' });
  } catch {
    res.status(503).json({ status: 'error', db: 'down' });
  }
}
