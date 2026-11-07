import { randomUUID } from 'node:crypto';
import { withTransaction } from '../lib/db.js';
import { businessDate } from '../lib/time.js';
import * as restaurantsRepo from '../repositories/restaurant.repository.js';
import * as usersRepo from '../repositories/user.repository.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/AppError.js';
import { iso } from '../utils/format.js';
import { estimateWaitMinutes } from './queue.state.js';
import * as storage from './storage.service.js';

export function toRestaurantDto(row) {
  const waitingCount = Number(row.waiting_count ?? 0);
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description,
    address: row.address,
    coverImageKey: row.cover_image_key,
    coverImageUrl: storage.publicUrl(row.cover_image_key),
    logoKey: row.logo_key,
    logoUrl: storage.publicUrl(row.logo_key),
    isOpen: Boolean(row.is_open),
    avgServiceMinutes: row.avg_service_minutes,
    nearThreshold: row.near_threshold,
    waitingCount,
    estWaitMin: estimateWaitMinutes(waitingCount, row.avg_service_minutes),
    createdAt: iso(row.created_at),
  };
}

export async function search({ q, page, pageSize }) {
  const { rows, total } = await restaurantsRepo.search({
    q,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    date: businessDate(),
  });
  return { items: rows.map(toRestaurantDto), total, page, pageSize };
}

export async function getById(id) {
  const row = await restaurantsRepo.findById(id, businessDate());
  if (!row) throw notFound('ไม่พบร้านอาหาร');
  return toRestaurantDto(row);
}

export async function getMine(user) {
  return getById(user.restaurantId);
}

export async function create(user, data) {
  if (user.restaurantId) throw conflict('บัญชีนี้มีร้านอาหารอยู่แล้ว', 'RESTAURANT_EXISTS');

  const id = await withTransaction(async (trx) => {
    const restaurantId = await restaurantsRepo.create(
      {
        owner_id: user.id,
        name: data.name,
        description: data.description ?? null,
        address: data.address ?? null,
        avg_service_minutes: data.avgServiceMinutes ?? 15,
        near_threshold: data.nearThreshold ?? 3,
        is_open: data.isOpen ?? true,
      },
      trx,
    );
    await usersRepo.update(user.id, { restaurant_id: restaurantId }, trx);
    return restaurantId;
  });
  return getById(id);
}

function assertOwnerOf(user, restaurantId) {
  if (user.role !== 'owner' || user.restaurantId !== restaurantId) {
    throw forbidden('เฉพาะเจ้าของร้านนี้เท่านั้นที่แก้ไขได้');
  }
}

const FIELD_MAP = {
  name: 'name',
  description: 'description',
  address: 'address',
  isOpen: 'is_open',
  avgServiceMinutes: 'avg_service_minutes',
  nearThreshold: 'near_threshold',
  coverImageKey: 'cover_image_key',
  logoKey: 'logo_key',
};

export async function update(user, id, data) {
  // staff เปิด/ปิดรับคิวได้ แต่แก้ข้อมูลอื่นไม่ได้
  const onlyToggle = Object.keys(data).every((k) => k === 'isOpen');
  if (onlyToggle && user.role === 'staff' && user.restaurantId === id) {
    // อนุญาต
  } else {
    assertOwnerOf(user, id);
  }

  // key รูปต้องอยู่ใต้ path ของร้านนี้เท่านั้น (กันชี้ไปไฟล์ของร้านอื่น)
  const prefix = `uploads/restaurants/${id}/`;
  for (const field of ['coverImageKey', 'logoKey']) {
    const key = data[field];
    if (key != null && (!key.startsWith(prefix) || key.includes('..'))) {
      throw badRequest('key ของรูปไม่ถูกต้อง');
    }
  }

  const patch = {};
  for (const [from, to] of Object.entries(FIELD_MAP)) {
    if (data[from] !== undefined) patch[to] = data[from];
  }
  if (Object.keys(patch).length) await restaurantsRepo.update(id, patch);
  return getById(id);
}

export async function createUploadUrl(user, id, { type, contentType }) {
  assertOwnerOf(user, id);
  const ext = storage.ALLOWED_IMAGE_TYPES[contentType];
  const key = `uploads/restaurants/${id}/${type}-${randomUUID()}.${ext}`;
  return storage.createUpload({ key, contentType });
}
