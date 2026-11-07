import * as restaurantService from '../services/restaurant.service.js';

export async function search(req, res) {
  res.json(await restaurantService.search(req.valid.query));
}

export async function getById(req, res) {
  res.json({ restaurant: await restaurantService.getById(req.valid.params.id) });
}

export async function create(req, res) {
  res.status(201).json({ restaurant: await restaurantService.create(req.user, req.valid.body) });
}

export async function update(req, res) {
  res.json({ restaurant: await restaurantService.update(req.user, req.valid.params.id, req.valid.body) });
}

export async function createUploadUrl(req, res) {
  res.json(await restaurantService.createUploadUrl(req.user, req.valid.params.id, req.valid.body));
}
