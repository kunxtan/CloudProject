import { authApi, restaurantApi } from './endpoints.js';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * อัปโหลดรูปตรงจาก browser ไปที่ storage (S3 presigned POST / dev upload)
 * 1) ขอ url + fields จาก backend  2) POST ไฟล์ไปตรงๆ  3) คืน key ให้ไปบันทึกในข้อมูล
 */
async function uploadImage(requestTarget, file) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) throw new Error('รองรับเฉพาะไฟล์ JPG, PNG หรือ WEBP');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('ไฟล์ต้องมีขนาดไม่เกิน 5MB');

  const { url, fields, key } = await requestTarget(file.type);

  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  form.append('file', file); // S3 กำหนดให้ไฟล์ต้องเป็น field สุดท้าย

  const res = await fetch(url, { method: 'POST', body: form });
  if (!res.ok) throw new Error('อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่');
  return key;
}

export const uploadRestaurantImage = (restaurantId, type, file) =>
  uploadImage((contentType) => restaurantApi.uploadUrl(restaurantId, { type, contentType }), file);

export const uploadAvatar = (file) => uploadImage((contentType) => authApi.avatarUploadUrl({ contentType }), file);
