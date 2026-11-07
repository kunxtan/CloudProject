import { Router } from 'express';
import * as staff from '../controllers/staff.controller.js';
import { authenticate, requireRestaurant, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { idParam } from '../validators/common.js';
import { staffActionBody, staffActionParams, staffListQuery } from '../validators/queue.schemas.js';
import { addMemberBody, createTableBody, statsQuery, updateTableBody } from '../validators/staff.schemas.js';

export const staffRouter = Router();

// ทุก endpoint: ต้องเป็น staff/owner และสังกัดร้านแล้ว → เห็นได้เฉพาะข้อมูลร้านตัวเอง
staffRouter.use(authenticate, requireRole('staff', 'owner'), requireRestaurant);

const ownerOnly = requireRole('owner');

staffRouter.get('/restaurant', staff.myRestaurant);

staffRouter.get('/queues', validate({ query: staffListQuery }), staff.listQueues); // ← ถูก poll
staffRouter.post('/queues/:id/:action', validate({ params: staffActionParams, body: staffActionBody }), staff.queueAction);

staffRouter.get('/tables', staff.listTables);
staffRouter.post('/tables', ownerOnly, validate({ body: createTableBody }), staff.createTable);
staffRouter.patch('/tables/:id', validate({ params: idParam, body: updateTableBody }), staff.updateTable);
staffRouter.delete('/tables/:id', ownerOnly, validate({ params: idParam }), staff.deleteTable);

staffRouter.get('/stats', validate({ query: statsQuery }), staff.stats);

staffRouter.get('/members', ownerOnly, staff.listMembers);
staffRouter.post('/members', ownerOnly, validate({ body: addMemberBody }), staff.addMember);
staffRouter.delete('/members/:id', ownerOnly, validate({ params: idParam }), staff.removeMember);
