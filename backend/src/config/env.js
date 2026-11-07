import { z } from 'zod';

// อ่านและตรวจสอบ environment variables ครั้งเดียวตอนเริ่มโปรแกรม
// ถ้าค่าไหนผิด → crash ทันที (fail fast) ดีกว่าไปพังกลางทาง
const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),

    DB_HOST: z.string().default('127.0.0.1'),
    DB_PORT: z.coerce.number().int().positive().default(3307),
    DB_USER: z.string().default('hiwlaewq'),
    DB_PASSWORD: z.string().default('hiwlaewq'),
    DB_NAME: z.string().default('hiwlaewq'),
    DB_POOL_MAX: z.coerce.number().int().positive().default(10),
    DB_SSL: z.enum(['', 'rds']).default(''),

    JWT_SECRET: z.string().min(16, 'JWT_SECRET ต้องยาวอย่างน้อย 16 ตัวอักษร'),
    JWT_EXPIRES_IN: z.string().default('1d'),
    BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),

    APP_TZ_OFFSET: z
      .string()
      .regex(/^[+-]\d{2}:\d{2}$/, 'รูปแบบต้องเป็น +HH:MM')
      .default('+07:00'),

    STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
    UPLOAD_DIR: z.string().default('./uploads'),
    S3_BUCKET: z.string().optional(),
    AWS_REGION: z.string().default('ap-southeast-1'),
    PUBLIC_ASSET_BASE_URL: z.string().default(''),

    TRUST_PROXY: z.string().default('0'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  })
  .refine((e) => e.STORAGE_DRIVER !== 's3' || !!e.S3_BUCKET, {
    message: 'ต้องกำหนด S3_BUCKET เมื่อ STORAGE_DRIVER=s3',
    path: ['S3_BUCKET'],
  });

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Environment variables ไม่ถูกต้อง:');
  for (const issue of parsed.error.issues) console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  process.exit(1);
}

const raw = parsed.data;

function parseTrustProxy(value) {
  if (/^\d+$/.test(value)) return Number(value);
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value; // เช่น 'loopback'
}

export const env = Object.freeze({
  ...raw,
  TRUST_PROXY: parseTrustProxy(raw.TRUST_PROXY),
  isProd: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
});
