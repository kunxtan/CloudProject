import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import * as auth from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { avatarUploadBody, loginBody, registerBody, updateProfileBody } from '../validators/auth.schemas.js';

// หมายเหตุ: rate limit นี้นับแยกต่อเครื่อง (memory store) — ถ้า 2 instance ก็ได้ limit x2
// ยอมรับได้สำหรับโปรเจกต์นี้ ถ้าต้องการแม่นยำต้องใช้ Redis store ร่วมกัน
const authLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.isTest,
  handler: (_req, res) =>
    res.status(429).json({ error: { code: 'TOO_MANY_REQUESTS', message: 'ลองหลายครั้งเกินไป กรุณารอ 1 นาที' } }),
});

export const authRouter = Router();

authRouter.post('/register', authLimiter, validate({ body: registerBody }), auth.register);
authRouter.post('/login', authLimiter, validate({ body: loginBody }), auth.login);
authRouter.get('/me', authenticate, auth.me);
authRouter.patch('/me', authenticate, validate({ body: updateProfileBody }), auth.updateMe);
authRouter.post('/me/avatar-upload-url', authenticate, validate({ body: avatarUploadBody }), auth.avatarUploadUrl);
