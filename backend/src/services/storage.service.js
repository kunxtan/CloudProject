import crypto from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { env } from '../config/env.js';
import { AppError, badRequest } from '../utils/AppError.js';

/**
 * อัปโหลดรูปแบบ "browser → storage ตรง" (backend ไม่ต้องรับไฟล์เอง → stateless + ไม่กิน bandwidth EC2)
 *
 *  - s3    (production): ออก S3 presigned POST ที่บังคับขนาด/ชนิดไฟล์ไว้ใน policy
 *  - local (dev)       : เลียนแบบ flow เดียวกัน แต่ส่งไฟล์มาที่ POST /api/dev-uploads แล้วเก็บลงดิสก์
 *
 * key ขึ้นต้นด้วย "uploads/" เสมอ → CloudFront behavior /uploads/* ชี้ไปที่ uploads bucket ได้ตรงๆ
 */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const UPLOAD_TTL_SECONDS = 300;

export const ALLOWED_IMAGE_TYPES = Object.freeze({
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
});

let s3;
const s3Client = () => (s3 ??= new S3Client({ region: env.AWS_REGION })); // credential มาจาก EC2 IAM Role

export function publicUrl(key) {
  return key ? `${env.PUBLIC_ASSET_BASE_URL}/${key}` : null;
}

const sign = (value) => crypto.createHmac('sha256', env.JWT_SECRET).update(value).digest('hex');

export async function createUpload({ key, contentType }) {
  if (env.STORAGE_DRIVER === 's3') {
    const { url, fields } = await createPresignedPost(s3Client(), {
      Bucket: env.S3_BUCKET,
      Key: key,
      Conditions: [
        ['content-length-range', 1, MAX_UPLOAD_BYTES],
        ['eq', '$Content-Type', contentType],
      ],
      Fields: { 'Content-Type': contentType },
      Expires: UPLOAD_TTL_SECONDS,
    });
    return { url, fields, key, maxBytes: MAX_UPLOAD_BYTES };
  }

  const expires = String(Date.now() + UPLOAD_TTL_SECONDS * 1000);
  return {
    url: '/api/dev-uploads',
    fields: { key, 'Content-Type': contentType, expires, signature: sign(`${key}|${contentType}|${expires}`) },
    key,
    maxBytes: MAX_UPLOAD_BYTES,
  };
}

/** รับไฟล์จาก browser ในโหมด local (ใช้ Web FormData parser ที่มากับ Node — ไม่ต้องลง multer) */
export async function saveLocalUpload(req) {
  const contentType = req.headers['content-type'] ?? '';
  if (!contentType.startsWith('multipart/form-data')) throw badRequest('ต้องส่งแบบ multipart/form-data');
  if (Number(req.headers['content-length'] ?? 0) > MAX_UPLOAD_BYTES + 64 * 1024) {
    throw new AppError(413, 'FILE_TOO_LARGE', 'ไฟล์ต้องมีขนาดไม่เกิน 5MB');
  }

  const form = await new Request('http://localhost/dev-uploads', {
    method: 'POST',
    headers: { 'content-type': contentType },
    body: Readable.toWeb(req),
    duplex: 'half',
  }).formData();

  const key = String(form.get('key') ?? '');
  const fileType = String(form.get('Content-Type') ?? '');
  const expires = String(form.get('expires') ?? '');
  const signature = String(form.get('signature') ?? '');
  const file = form.get('file');

  const expected = sign(`${key}|${fileType}|${expires}`);
  const valid =
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) &&
    Number(expires) > Date.now();
  if (!valid) throw new AppError(403, 'UPLOAD_SIGNATURE_INVALID', 'ลิงก์อัปโหลดไม่ถูกต้องหรือหมดอายุ');

  if (!file || typeof file === 'string') throw badRequest('ไม่พบไฟล์');
  if (file.size > MAX_UPLOAD_BYTES) throw new AppError(413, 'FILE_TOO_LARGE', 'ไฟล์ต้องมีขนาดไม่เกิน 5MB');

  const root = path.resolve(env.UPLOAD_DIR);
  const dest = path.resolve(root, key.replace(/^uploads\//, ''));
  if (!dest.startsWith(root + path.sep)) throw badRequest('key ไม่ถูกต้อง');

  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, Buffer.from(await file.arrayBuffer()));
  return { key };
}
