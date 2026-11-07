import { z } from 'zod';

export const idParam = z.object({ id: z.coerce.number().int().positive() });

export const emailField = z
  .string({ error: 'กรุณากรอกอีเมล' })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'รูปแบบอีเมลไม่ถูกต้อง' }).max(255));

export const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'รูปแบบวันที่ต้องเป็น YYYY-MM-DD');
