import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import * as usersRepo from '../repositories/user.repository.js';
import { forbidden, unauthorized } from '../utils/AppError.js';

/**
 * ตรวจ JWT แล้วโหลด user จาก DB ทุก request
 * - Stateless: ไม่มี session ใน memory → request ไปเครื่องไหนหลัง ALB ก็ได้
 * - โหลดจาก DB ทุกครั้ง → ถ้า owner ถอด staff ออก สิทธิ์หายทันทีไม่ต้องรอ token หมดอายุ
 */
export async function authenticate(req, _res, next) {
  const [scheme, token] = (req.get('authorization') ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) throw unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    throw unauthorized('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 'TOKEN_INVALID');
  }

  const user = await usersRepo.findById(Number(payload.sub));
  if (!user) throw unauthorized('ไม่พบบัญชีผู้ใช้', 'TOKEN_INVALID');

  req.user = usersRepo.toPublicUser(user);
  next();
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user?.role)) throw forbidden();
    next();
  };
}

/** staff/owner ต้องสังกัดร้านก่อนถึงจะใช้ /staff/* ได้ */
export function requireRestaurant(req, _res, next) {
  if (!req.user?.restaurantId) {
    throw forbidden('บัญชีนี้ยังไม่ได้ผูกกับร้านอาหาร', 'NO_RESTAURANT');
  }
  next();
}
