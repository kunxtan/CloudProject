import { withTransaction } from '../lib/db.js';
import { businessDate } from '../lib/time.js';
import * as notificationsRepo from '../repositories/notification.repository.js';
import * as queuesRepo from '../repositories/queue.repository.js';
import * as restaurantsRepo from '../repositories/restaurant.repository.js';
import * as tablesRepo from '../repositories/table.repository.js';
import * as usersRepo from '../repositories/user.repository.js';
import { badRequest, conflict, notFound } from '../utils/AppError.js';
import { formatQueueNumber, iso } from '../utils/format.js';
import * as notificationService from './notification.service.js';
import { assertTransition, estimateWaitMinutes, timestampPatch } from './queue.state.js';

export function toQueueDto(row) {
  const ahead = row.status === 'waiting' ? Number(row.ahead ?? 0) : 0;
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    restaurantName: row.restaurant_name,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    queueNumber: row.queue_number,
    displayNumber: formatQueueNumber(row.queue_number),
    queueDate: row.queue_date,
    partySize: row.party_size,
    status: row.status,
    ahead,
    estWaitMin: row.status === 'waiting' ? estimateWaitMinutes(ahead, row.avg_service_minutes) : 0,
    tableId: row.table_id,
    tableLabel: row.table_label,
    createdAt: iso(row.created_at),
    calledAt: iso(row.called_at),
    seatedAt: iso(row.seated_at),
    endedAt: iso(row.ended_at),
  };
}

async function getDto(queueId) {
  return toQueueDto(await queuesRepo.findDetailedById(queueId));
}

/* ───────────────────────────── Customer ───────────────────────────── */

export async function book(user, restaurantId, { partySize }) {
  const date = businessDate();

  const queueId = await withTransaction(async (trx) => {
    // ล็อก user เป็นคำสั่งแรก → ถ้ากดจองซ้ำพร้อมกัน request ที่สองจะรอ แล้วเห็นคิวที่เพิ่งจองไป
    await usersRepo.lockById(user.id, trx);

    const restaurant = await restaurantsRepo.findRawById(restaurantId, trx);
    if (!restaurant) throw notFound('ไม่พบร้านอาหาร');
    if (!restaurant.is_open) throw conflict('ร้านปิดรับคิวอยู่ในขณะนี้', 'RESTAURANT_CLOSED');

    if (await queuesRepo.findActiveForCustomer(trx, user.id, restaurantId, date)) {
      throw conflict('คุณมีคิวที่ร้านนี้อยู่แล้ว', 'ALREADY_IN_QUEUE');
    }

    const queueNumber = await queuesRepo.nextNumber(trx, restaurantId, date);
    return queuesRepo.insert(trx, {
      restaurant_id: restaurantId,
      customer_id: user.id,
      queue_date: date,
      queue_number: queueNumber,
      party_size: partySize,
      status: 'waiting',
    });
  });

  await notificationService.refreshNear(restaurantId, date);
  return getDto(queueId);
}

export async function listMine(user) {
  const rows = await queuesRepo.listActiveByCustomer(user.id, businessDate());
  return rows.map(toQueueDto);
}

export async function history(user) {
  const rows = await queuesRepo.listHistoryByCustomer(user.id);
  return rows.map(toQueueDto);
}

export async function cancelByCustomer(user, queueId) {
  const queue = await withTransaction(async (trx) => {
    const q = await queuesRepo.findById(queueId, trx, { forUpdate: true });
    if (!q || q.customer_id !== user.id) throw notFound('ไม่พบคิวนี้');
    assertTransition(q.status, 'cancelled');
    await queuesRepo.update(q.id, { status: 'cancelled', ...timestampPatch('cancelled') }, trx);
    return q;
  });

  await notificationService.refreshNear(queue.restaurant_id, queue.queue_date);
  return getDto(queueId);
}

/* ─────────────────────────────── Staff ─────────────────────────────── */

const ACTION_TO_STATUS = Object.freeze({
  call: 'called',
  skip: 'skipped',
  cancel: 'cancelled',
  seat: 'seated',
});

export async function listForStaff(user, { statuses }) {
  const rows = await queuesRepo.listForRestaurant(user.restaurantId, businessDate(), statuses);
  return rows.map(toQueueDto);
}

export async function staffAction(user, queueId, action, { tableId } = {}) {
  const to = ACTION_TO_STATUS[action];
  if (to === 'seated' && !tableId) throw badRequest('กรุณาเลือกโต๊ะ', 'TABLE_REQUIRED');

  const queue = await withTransaction(async (trx) => {
    const q = await queuesRepo.findById(queueId, trx, { forUpdate: true });
    if (!q || q.restaurant_id !== user.restaurantId) throw notFound('ไม่พบคิวนี้');
    assertTransition(q.status, to);

    const patch = { status: to, ...timestampPatch(to) };

    if (to === 'seated') {
      const table = await tablesRepo.findById(tableId, trx, { forUpdate: true });
      if (!table || table.restaurant_id !== user.restaurantId) throw notFound('ไม่พบโต๊ะนี้');
      if (table.status !== 'available') throw conflict(`โต๊ะ ${table.label} ไม่ว่าง`, 'TABLE_NOT_AVAILABLE');
      if (table.capacity < q.party_size) {
        throw conflict(
          `โต๊ะ ${table.label} นั่งได้ ${table.capacity} คน แต่ลูกค้ามา ${q.party_size} คน`,
          'TABLE_TOO_SMALL',
        );
      }
      await tablesRepo.update(table.id, { status: 'occupied' }, trx);
      patch.table_id = table.id;
    }

    await queuesRepo.update(q.id, patch, trx);

    if (to === 'called') {
      const restaurant = await restaurantsRepo.findRawById(q.restaurant_id, trx);
      await notificationsRepo.insertIgnore([notificationService.readyRow(q, restaurant.name)], trx);
    }
    return q;
  });

  await notificationService.refreshNear(queue.restaurant_id, queue.queue_date);
  return getDto(queueId);
}
