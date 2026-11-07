import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      NODE_ENV: 'test',
      DB_HOST: process.env.DB_HOST ?? '127.0.0.1',
      DB_PORT: process.env.DB_PORT ?? '3307',
      DB_USER: process.env.DB_USER ?? 'hiwlaewq',
      DB_PASSWORD: process.env.DB_PASSWORD ?? 'hiwlaewq',
      DB_NAME: process.env.DB_NAME ?? 'hiwlaewq_test',
      DB_POOL_MAX: '20',
      JWT_SECRET: 'test-secret-0123456789abcdef',
      BCRYPT_ROUNDS: '4',
      STORAGE_DRIVER: 'local',
      UPLOAD_DIR: './uploads-test',
      LOG_LEVEL: process.env.LOG_LEVEL ?? 'silent',
    },
    // integration test ใช้ DB ก้อนเดียวกัน → รันทีละไฟล์
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
