import { businessDate } from '../lib/time.js';
import * as queuesRepo from '../repositories/queue.repository.js';
import * as tablesRepo from '../repositories/table.repository.js';
import { forbidden, notFound } from '../utils/AppError.js';
import { formatQueueNumber } from '../utils/format.js';

const toDto = (row, seatedQueue) => ({
  id: row.id,
  label: row.label,
  capacity: row.capacity,
  status: row.status,
  currentQueue: seatedQueue
    ? {
        id: seatedQueue.id,
        displayNumber: formatQueueNumber(seatedQueue.queue_number),
        customerName: seatedQueue.customer_name,
        partySize: seatedQueue.party_size,
      }
    : null,
});

export async function list(user) {
  const [tables, seated] = await Promise.all([
    tablesRepo.list(user.restaurantId),
    queuesRepo.listForRestaurant(user.restaurantId, businessDate(), ['seated']),
  ]);
  // ลูกค้าที่นั่งล่าสุดของแต่ละโต๊ะ (วันนี้)
  const byTable = new Map();
  for (const q of seated) {
    if (q.table_id && (!byTable.has(q.table_id) || byTable.get(q.table_id).seated_at < q.seated_at)) {
      byTable.set(q.table_id, q);
    }
  }
  return tables.map((t) => toDto(t, t.status === 'occupied' ? byTable.get(t.id) : null));
}

async function findOwned(user, id) {
  const table = await tablesRepo.findById(id);
  if (!table || table.restaurant_id !== user.restaurantId) throw notFound('ไม่พบโต๊ะนี้');
  return table;
}

export async function create(user, { label, capacity }) {
  const id = await tablesRepo.create({ restaurant_id: user.restaurantId, label, capacity, status: 'available' });
  return toDto(await tablesRepo.findById(id));
}

export async function update(user, id, data) {
  await findOwned(user, id);
  // staff เปลี่ยนได้แค่สถานะโต๊ะ, owner แก้ได้ทุกอย่าง
  if (user.role !== 'owner' && (data.label !== undefined || data.capacity !== undefined)) {
    throw forbidden('เฉพาะเจ้าของร้านเท่านั้นที่แก้ชื่อ/จำนวนที่นั่งของโต๊ะได้');
  }
  const patch = {};
  for (const k of ['label', 'capacity', 'status']) if (data[k] !== undefined) patch[k] = data[k];
  if (Object.keys(patch).length) await tablesRepo.update(id, patch);
  return toDto(await tablesRepo.findById(id));
}

export async function remove(user, id) {
  await findOwned(user, id);
  await tablesRepo.remove(id);
}
