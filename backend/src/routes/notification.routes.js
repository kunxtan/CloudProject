import { Router } from 'express';
import * as notifications from '../controllers/notification.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { idParam } from '../validators/common.js';
import { notificationsQuery } from '../validators/staff.schemas.js';

export const notificationRouter = Router();

notificationRouter.use(authenticate);

notificationRouter.get('/', validate({ query: notificationsQuery }), notifications.list); // ← ถูก poll
notificationRouter.post('/read-all', notifications.markAllRead);
notificationRouter.patch('/:id/read', validate({ params: idParam }), notifications.markRead);
