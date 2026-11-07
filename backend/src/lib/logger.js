import pino from 'pino';
import { env } from '../config/env.js';

// JSON log → ใน production ส่งเข้า CloudWatch Logs ผ่าน Docker awslogs driver
export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'hiwlaewq-backend' },
  redact: ['req.headers.authorization', 'req.headers.cookie'],
});
