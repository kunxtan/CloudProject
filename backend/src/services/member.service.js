import * as usersRepo from '../repositories/user.repository.js';
import { conflict, notFound } from '../utils/AppError.js';

/** owner จัดการพนักงานของร้าน: เพิ่มด้วยอีเมลของบัญชีที่สมัครไว้แล้ว */

export async function list(user) {
  const rows = await usersRepo.listStaff(user.restaurantId);
  return rows.map(usersRepo.toPublicUser);
}

export async function add(user, { email }) {
  const target = await usersRepo.findByEmail(email);
  if (!target) throw notFound('ไม่พบบัญชีที่ใช้อีเมลนี้ — ให้พนักงานสมัครสมาชิกก่อน', 'USER_NOT_FOUND');
  if (target.role === 'owner') throw conflict('บัญชีนี้เป็นเจ้าของร้าน ไม่สามารถเพิ่มเป็นพนักงานได้');
  if (target.role === 'staff') {
    throw conflict(
      target.restaurant_id === user.restaurantId ? 'บัญชีนี้เป็นพนักงานของร้านอยู่แล้ว' : 'บัญชีนี้เป็นพนักงานของร้านอื่นอยู่',
      'ALREADY_STAFF',
    );
  }
  await usersRepo.update(target.id, { role: 'staff', restaurant_id: user.restaurantId });
  return usersRepo.toPublicUser(await usersRepo.findById(target.id));
}

export async function remove(user, userId) {
  const target = await usersRepo.findById(userId);
  if (!target || target.role !== 'staff' || target.restaurant_id !== user.restaurantId) {
    throw notFound('ไม่พบพนักงานคนนี้ในร้าน');
  }
  await usersRepo.update(target.id, { role: 'customer', restaurant_id: null });
}
