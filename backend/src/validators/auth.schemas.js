import { z } from 'zod';
import { ALLOWED_IMAGE_TYPES } from '../services/storage.service.js';
import { emailField } from './common.js';

const phoneField = z
  .string()
  .trim()
  .regex(/^[0-9+\-\s]{9,20}$/, 'เบอร์โทรไม่ถูกต้อง');
const nameField = z.string().trim().min(1, 'กรุณากรอกชื่อ').max(100);

export const registerBody = z.object({
  email: emailField,
  password: z.string().min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร').max(72, 'รหัสผ่านยาวเกินไป'),
  name: nameField,
  phone: phoneField.optional().or(z.literal('')),
  // สมัครเป็น staff เองไม่ได้ — owner ต้องเป็นคนเพิ่ม
  role: z.enum(['customer', 'owner']).default('customer'),
});

export const loginBody = z.object({
  email: emailField,
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
});

/** แก้โปรไฟล์ตัวเอง — strict: ส่ง role / email / restaurantId มาจะถูกปฏิเสธ (กันยกระดับสิทธิ์ตัวเอง) */
export const updateProfileBody = z
  .object({
    name: nameField.optional(),
    phone: phoneField.nullable().optional().or(z.literal('').transform(() => null)),
    avatarKey: z.string().max(255).nullable().optional(),
  })
  .strict();

export const avatarUploadBody = z.object({
  contentType: z.enum(Object.keys(ALLOWED_IMAGE_TYPES), { error: 'รองรับเฉพาะไฟล์ JPG, PNG, WEBP' }),
});
