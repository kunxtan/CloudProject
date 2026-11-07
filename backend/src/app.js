import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { apiRouter } from './routes/index.js';

/** สร้าง Express app (ไม่ listen) — แยกจาก server.js เพื่อให้ test เรียกใช้ได้ตรงๆ */
export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  // อยู่หลัง CloudFront + ALB → ต้องบอกจำนวน proxy เพื่อให้ req.ip เป็น IP จริงของผู้ใช้ (ใช้กับ rate limit)
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(helmet());
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url.startsWith('/api/health') },
      customProps: (req) => ({ userId: req.user?.id }),
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  if (env.STORAGE_DRIVER === 'local') {
    app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR), { maxAge: '1h' }));
  }

  app.use('/api', apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
