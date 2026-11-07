import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import * as usersRepo from '../repositories/user.repository.js';
import { badRequest, conflict, unauthorized } from '../utils/AppError.js';
import * as storage from './storage.service.js';

// ใช้เทียบเมื่อไม่พบอีเมล เพื่อให้เวลาตอบกลับใกล้เคียงกัน (กันการเดาว่าอีเมลไหนมีในระบบ)
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 10);

function signToken(user) {
  return jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: String(user.id),
    expiresIn: env.JWT_EXPIRES_IN,
    algorithm: 'HS256',
  });
}

export async function register({ email, password, name, phone, role }) {
  if (await usersRepo.findByEmail(email)) throw conflict('อีเมลนี้ถูกใช้สมัครแล้ว', 'EMAIL_TAKEN');

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  const id = await usersRepo.create({ email, password_hash: passwordHash, name, phone: phone || null, role });
  const user = await usersRepo.findById(id);
  return { token: signToken(user), user: usersRepo.toPublicUser(user) };
}

export async function login({ email, password }) {
  const user = await usersRepo.findByEmail(email);
  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) throw unauthorized('อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'INVALID_CREDENTIALS');
  return { token: signToken(user), user: usersRepo.toPublicUser(user) };
}

/* ─────────────────────────────── โปรไฟล์ ─────────────────────────────── */

const avatarPrefix = (userId) => `uploads/users/${userId}/`;

export async function updateProfile(user, { name, phone, avatarKey }) {
  // key รูปต้องอยู่ใต้ path ของ user คนนี้เท่านั้น (กันชี้ไปไฟล์ของคนอื่น)
  if (avatarKey != null && (!avatarKey.startsWith(avatarPrefix(user.id)) || avatarKey.includes('..'))) {
    throw badRequest('key ของรูปไม่ถูกต้อง');
  }

  const patch = {};
  if (name !== undefined) patch.name = name;
  if (phone !== undefined) patch.phone = phone;
  if (avatarKey !== undefined) patch.avatar_key = avatarKey;
  if (Object.keys(patch).length) await usersRepo.update(user.id, patch);

  return usersRepo.toPublicUser(await usersRepo.findById(user.id));
}

export function createAvatarUploadUrl(user, { contentType }) {
  const ext = storage.ALLOWED_IMAGE_TYPES[contentType];
  return storage.createUpload({ key: `${avatarPrefix(user.id)}avatar-${randomUUID()}.${ext}`, contentType });
}
