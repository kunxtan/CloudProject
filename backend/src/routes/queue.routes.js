import { Router } from 'express';
import * as queues from '../controllers/queue.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { idParam } from '../validators/common.js';

export const queueRouter = Router();

queueRouter.use(authenticate, requireRole('customer'));

queueRouter.get('/me', queues.listMine); // ← ถูก poll ทุก 5 วินาที
queueRouter.get('/me/history', queues.history);
queueRouter.post('/:id/cancel', validate({ params: idParam }), queues.cancel);
