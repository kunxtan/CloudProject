import { Router } from 'express';
import { env } from '../config/env.js';
import { saveLocalUpload } from '../services/storage.service.js';
import { authRouter } from './auth.routes.js';
import { healthRouter } from './health.routes.js';
import { notificationRouter } from './notification.routes.js';
import { queueRouter } from './queue.routes.js';
import { restaurantRouter } from './restaurant.routes.js';
import { staffRouter } from './staff.routes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/restaurants', restaurantRouter);
apiRouter.use('/queues', queueRouter);
apiRouter.use('/staff', staffRouter);
apiRouter.use('/notifications', notificationRouter);

// โหมด dev: จำลอง S3 presigned POST (production ไฟล์วิ่งตรงจาก browser ไป S3 ไม่ผ่าน backend)
if (env.STORAGE_DRIVER === 'local') {
  apiRouter.post('/dev-uploads', async (req, res) => {
    res.status(201).json(await saveLocalUpload(req));
  });
}
