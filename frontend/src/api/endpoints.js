import { api } from './client.js';

const data = (p) => p.then((r) => r.data);

export const authApi = {
  register: (body) => data(api.post('/auth/register', body)),
  login: (body) => data(api.post('/auth/login', body)),
  me: () => data(api.get('/auth/me')).then((d) => d.user),
  updateMe: (body) => data(api.patch('/auth/me', body)).then((d) => d.user),
  avatarUploadUrl: (body) => data(api.post('/auth/me/avatar-upload-url', body)),
};

export const restaurantApi = {
  search: (params) => data(api.get('/restaurants', { params })),
  get: (id) => data(api.get(`/restaurants/${id}`)).then((d) => d.restaurant),
  create: (body) => data(api.post('/restaurants', body)).then((d) => d.restaurant),
  update: (id, body) => data(api.patch(`/restaurants/${id}`, body)).then((d) => d.restaurant),
  uploadUrl: (id, body) => data(api.post(`/restaurants/${id}/upload-url`, body)),
  book: (id, partySize) => data(api.post(`/restaurants/${id}/queues`, { partySize })).then((d) => d.queue),
};

export const queueApi = {
  mine: () => data(api.get('/queues/me')).then((d) => d.queues),
  history: () => data(api.get('/queues/me/history')).then((d) => d.queues),
  cancel: (id) => data(api.post(`/queues/${id}/cancel`)).then((d) => d.queue),
};

export const staffApi = {
  restaurant: () => data(api.get('/staff/restaurant')).then((d) => d.restaurant),
  queues: (status = 'waiting,called') => data(api.get('/staff/queues', { params: { status } })).then((d) => d.queues),
  action: (id, action, body = {}) => data(api.post(`/staff/queues/${id}/${action}`, body)).then((d) => d.queue),
  tables: () => data(api.get('/staff/tables')).then((d) => d.tables),
  createTable: (body) => data(api.post('/staff/tables', body)).then((d) => d.table),
  updateTable: (id, body) => data(api.patch(`/staff/tables/${id}`, body)).then((d) => d.table),
  deleteTable: (id) => api.delete(`/staff/tables/${id}`),
  stats: (params) => data(api.get('/staff/stats', { params })),
  members: () => data(api.get('/staff/members')).then((d) => d.members),
  addMember: (email) => data(api.post('/staff/members', { email })).then((d) => d.member),
  removeMember: (id) => api.delete(`/staff/members/${id}`),
};

export const notificationApi = {
  unread: () => data(api.get('/notifications', { params: { unread: true } })).then((d) => d.notifications),
  all: () => data(api.get('/notifications', { params: { unread: false } })).then((d) => d.notifications),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
};
