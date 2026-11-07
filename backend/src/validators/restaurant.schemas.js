import { z } from 'zod';
import { ALLOWED_IMAGE_TYPES } from '../services/storage.service.js';

export const searchQuery = z.object({
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

const restaurantFields = {
  name: z.string().trim().min(1, 'กรุณากรอกชื่อร้าน').max(150),
  description: z.string().trim().max(2000).nullable().optional(),
  address: z.string().trim().max(255).nullable().optional(),
  isOpen: z.boolean().optional(),
  avgServiceMinutes: z.coerce.number().int().min(1, 'อย่างน้อย 1 นาที').max(240).optional(),
  nearThreshold: z.coerce.number().int().min(0).max(20).optional(),
};

export const createBody = z.object(restaurantFields);

export const updateBody = z
  .object({
    ...restaurantFields,
    name: restaurantFields.name.optional(),
    coverImageKey: z.string().max(255).nullable().optional(),
    logoKey: z.string().max(255).nullable().optional(),
  })
  .strict();

export const uploadUrlBody = z.object({
  type: z.enum(['cover', 'logo']),
  contentType: z.enum(Object.keys(ALLOWED_IMAGE_TYPES), { error: 'รองรับเฉพาะไฟล์ JPG, PNG, WEBP' }),
});
