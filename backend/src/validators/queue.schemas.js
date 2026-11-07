import { z } from 'zod';

export const bookBody = z.object({
  partySize: z.coerce
    .number({ error: 'กรุณาระบุจำนวนคน' })
    .int()
    .min(1, 'อย่างน้อย 1 คน')
    .max(20, 'จองได้ไม่เกิน 20 คนต่อคิว'),
});

const STATUSES = ['waiting', 'called', 'seated', 'skipped', 'cancelled'];

export const staffListQuery = z.object({
  status: z
    .string()
    .default('waiting,called')
    .transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean))
    .pipe(z.array(z.enum(STATUSES)).min(1)),
});

export const staffActionParams = z.object({
  id: z.coerce.number().int().positive(),
  action: z.enum(['call', 'skip', 'cancel', 'seat']),
});

export const staffActionBody = z.object({
  tableId: z.coerce.number().int().positive().optional(),
});
