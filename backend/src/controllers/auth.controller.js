import * as authService from '../services/auth.service.js';

export async function register(req, res) {
  res.status(201).json(await authService.register(req.valid.body));
}

export async function login(req, res) {
  res.json(await authService.login(req.valid.body));
}

export function me(req, res) {
  res.json({ user: req.user });
}

export async function updateMe(req, res) {
  res.json({ user: await authService.updateProfile(req.user, req.valid.body) });
}

export async function avatarUploadUrl(req, res) {
  res.json(await authService.createAvatarUploadUrl(req.user, req.valid.body));
}
