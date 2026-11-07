import { Router } from 'express';
import * as queues from '../controllers/queue.controller.js';
import * as restaurants from '../controllers/restaurant.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { idParam } from '../validators/common.js';
import { bookBody } from '../validators/queue.schemas.js';
import { createBody, searchQuery, updateBody, uploadUrlBody } from '../validators/restaurant.schemas.js';

export const restaurantRouter = Router();

// public
restaurantRouter.get('/', validate({ query: searchQuery }), restaurants.search);
restaurantRouter.get('/:id', validate({ params: idParam }), restaurants.getById);

// owner
restaurantRouter.post('/', authenticate, requireRole('owner'), validate({ body: createBody }), restaurants.create);
restaurantRouter.patch(
  '/:id',
  authenticate,
  requireRole('owner', 'staff'), // staff เปิด/ปิดรับคิวได้ (ตรวจละเอียดใน service)
  validate({ params: idParam, body: updateBody }),
  restaurants.update,
);
restaurantRouter.post(
  '/:id/upload-url',
  authenticate,
  requireRole('owner'),
  validate({ params: idParam, body: uploadUrlBody }),
  restaurants.createUploadUrl,
);

// customer จองคิว
restaurantRouter.post(
  '/:id/queues',
  authenticate,
  requireRole('customer'),
  validate({ params: idParam, body: bookBody }),
  queues.book,
);
