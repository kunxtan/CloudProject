import { env } from '../config/env.js';

export function offsetToMinutes(offset) {
  const sign = offset.startsWith('-') ? -1 : 1;
  const [h, m] = offset.slice(1).split(':').map(Number);
  return sign * (h * 60 + m);
}

/**
 * "วันทำการ" ตามเวลาท้องถิ่นของร้าน (ไทย +07:00) ในรูปแบบ YYYY-MM-DD
 * เลขคิวจะเริ่มนับ 1 ใหม่ทุกวันตามค่านี้
 */
export function businessDate(now = new Date(), offset = env.APP_TZ_OFFSET) {
  return new Date(now.getTime() + offsetToMinutes(offset) * 60_000).toISOString().slice(0, 10);
}

export function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from, to) {
  return Math.round((new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86_400_000);
}
