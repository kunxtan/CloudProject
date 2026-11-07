import { retryOnLock } from '../lib/db.js';
import { logger } from '../lib/logger.js';
import * as notificationsRepo from '../repositories/notification.repository.js';
import * as queuesRepo from '../repositories/queue.repository.js';
import * as restaurantsRepo from '../repositories/restaurant.repository.js';
import { notFound } from '../utils/AppError.js';
import { formatQueueNumber, iso } from '../utils/format.js';

/**
 * Notification แบบ in-app: เขียนลงตาราง notifications แล้ว frontend poll ไปแสดง
 * (+ Browser Notification API) — stateless ไม่ต้องมี WebSocket
 */

export function readyRow(queue, restaurantName) {
  return {
    user_id: queue.customer_id,
    queue_id: queue.id,
    type: 'ready',
    message: `ถึงคิวของคุณแล้ว! คิว ${formatQueueNumber(queue.queue_number)} ที่ร้าน ${restaurantName} กรุณาแสดงตัวที่หน้าร้าน`,
  };
}

/**
 * แจ้งเตือน "ใกล้ถึงคิว" ให้ N คิวแรกที่ยังรออยู่ (N = near_threshold ของร้าน)
 * เรียกหลังทุกครั้งที่สถานะคิวในร้านเปลี่ยน — เรียกซ้ำได้เพราะ UNIQUE(queue_id, type) กันซ้ำไว้
 * ตั้งใจเรียก "หลัง commit" เพื่อให้อ่านข้อมูลล่าสุดเสมอ
 *
 * เป็นแบบ best-effort: ถ้าล้มจะแค่ log ไว้ ไม่โยน error
 * (การจอง/เรียกคิว commit ไปแล้ว — ห้ามตอบ 500 ทั้งที่ทำสำเร็จ และรอบถัดไปจะสร้างให้เองอยู่ดี)
 */
export async function refreshNear(restaurantId, date) {
  try {
    const restaurant = await restaurantsRepo.findRawById(restaurantId);
    if (!restaurant || restaurant.near_threshold <= 0) return;

    const waiting = await queuesRepo.firstWaiting(restaurantId, date, restaurant.near_threshold);
    // กรองที่มีแล้วออกก่อน → ส่วนใหญ่ไม่ต้อง INSERT เลย ลดการแย่ง lock เวลาจองพร้อมกันเยอะๆ
    const existing = await notificationsRepo.existingQueueIds(waiting.map((q) => q.id), 'near');
    const rows = waiting
      .map((q, ahead) => ({ q, ahead }))
      .filter(({ q }) => !existing.has(q.id))
      .map(({ q, ahead }) => ({
        user_id: q.customer_id,
        queue_id: q.id,
        type: 'near',
        message:
          ahead === 0
            ? `ใกล้ถึงคิวแล้ว! คิว ${formatQueueNumber(q.queue_number)} ที่ร้าน ${restaurant.name} — คุณเป็นคิวถัดไป`
            : `ใกล้ถึงคิวแล้ว! คิว ${formatQueueNumber(q.queue_number)} ที่ร้าน ${restaurant.name} — เหลืออีก ${ahead} คิว`,
      }));
    await retryOnLock(() => notificationsRepo.insertIgnore(rows));
  } catch (err) {
    logger.warn({ err, restaurantId, date }, 'refreshNear failed (will be retried on next queue change)');
  }
}

const toDto = (row) => ({
  id: row.id,
  queueId: row.queue_id,
  type: row.type,
  message: row.message,
  isRead: Boolean(row.is_read),
  createdAt: iso(row.created_at),
});

export async function list(user, { unread }) {
  const rows = await notificationsRepo.list(user.id, { unreadOnly: unread });
  return rows.map(toDto);
}

export async function markRead(user, id) {
  const updated = await notificationsRepo.markRead(user.id, id);
  if (!updated) throw notFound('ไม่พบการแจ้งเตือน');
}

export async function markAllRead(user) {
  await notificationsRepo.markAllRead(user.id);
}
