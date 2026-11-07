import { env } from '../config/env.js';
import { addDays, businessDate, daysBetween } from '../lib/time.js';
import * as statsRepo from '../repositories/stats.repository.js';
import { badRequest } from '../utils/AppError.js';

const MAX_RANGE_DAYS = 92;
const round1 = (n) => (n == null ? null : Math.round(Number(n) * 10) / 10);

export async function get(user, { from, to }) {
  const end = to ?? businessDate();
  const start = from ?? addDays(end, -6);
  if (start > end) throw badRequest('วันเริ่มต้นต้องไม่เกินวันสิ้นสุด');
  if (daysBetween(start, end) > MAX_RANGE_DAYS) throw badRequest(`เลือกช่วงได้ไม่เกิน ${MAX_RANGE_DAYS} วัน`);

  const rid = user.restaurantId;
  const [summary, daily, hourly] = await Promise.all([
    statsRepo.summary(rid, start, end),
    statsRepo.daily(rid, start, end),
    statsRepo.hourly(rid, start, end, env.APP_TZ_OFFSET),
  ]);

  // เติมวัน/ชั่วโมงที่ไม่มีคิวให้เป็น 0 → กราฟต่อเนื่อง
  const dailyMap = new Map(daily.map((d) => [d.date, d]));
  const days = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const row = dailyMap.get(d);
    days.push({ date: d, total: Number(row?.total ?? 0), seated: Number(row?.seated ?? 0), dropped: Number(row?.dropped ?? 0) });
  }

  const hourlyMap = new Map(hourly.map((h) => [Number(h.hour), h]));
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    total: Number(hourlyMap.get(hour)?.total ?? 0),
    avgWaitMinutes: round1(hourlyMap.get(hour)?.avg_wait_minutes ?? null),
  }));

  const total = Number(summary.total ?? 0);
  return {
    from: start,
    to: end,
    summary: {
      total,
      seated: Number(summary.seated ?? 0),
      dropped: Number(summary.dropped ?? 0),
      dropRate: total ? round1((Number(summary.dropped) / total) * 100) : 0,
      avgWaitMinutes: round1(summary.avg_wait_minutes),
      avgPartySize: round1(summary.avg_party_size),
    },
    daily: days,
    hourly: hours,
  };
}
