import { z } from 'zod';
import { dateField, emailField } from './common.js';

export const createTableBody = z.object({
  label: z.string().trim().min(1, 'กรุณาตั้งชื่อโต๊ะ').max(20),
  capacity: z.coerce.number().int().min(1).max(50),
});

export const updateTableBody = z
  .object({
    label: z.string().trim().min(1).max(20).optional(),
    capacity: z.coerce.number().int().min(1).max(50).optional(),
    status: z.enum(['available', 'occupied', 'cleaning']).optional(),
  })
  .strict();

export const statsQuery = z.object({
  from: dateField.optional(),
  to: dateField.optional(),
});

export const addMemberBody = z.object({ email: emailField });

export const notificationsQuery = z.object({
  unread: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});
