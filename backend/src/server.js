import { createApp } from './app.js';
import { env } from './config/env.js';
import { db } from './lib/db.js';
import { logger } from './lib/logger.js';

const app = createApp();

// Express 5 ส่ง error (เช่น port ถูกใช้อยู่) มาที่ callback แทนการ throw → ต้องเช็คเอง
const server = app.listen(env.PORT, (err) => {
  if (err) {
    const hint =
      err.code === 'EADDRINUSE'
        ? `port ${env.PORT} ถูกโปรแกรมอื่นใช้อยู่ — ปิดตัวเก่าก่อน หรือเปลี่ยน PORT ใน .env`
        : err.message;
    logger.fatal({ err }, `เริ่ม server ไม่ได้: ${hint}`);
    process.exit(1);
  }
  logger.info({ port: env.PORT, env: env.NODE_ENV, storage: env.STORAGE_DRIVER }, 'hiwlaewQ backend started');
});

// ต้องนานกว่า idle timeout ของ ALB (60s) ไม่งั้น ALB อาจส่ง request เข้า connection ที่ Node เพิ่งปิด → 502
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

/**
 * Graceful shutdown — สำคัญตอน rolling deploy / ASG ลบเครื่อง
 * docker stop ส่ง SIGTERM → หยุดรับ connection ใหม่ → รอ request ที่ค้างอยู่ให้เสร็จ → ปิด DB pool → exit
 */
let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'shutting down gracefully');

  setTimeout(() => {
    logger.error('forced shutdown after timeout');
    process.exit(1);
  }, 25_000).unref();

  server.close(async (err) => {
    if (err) logger.error({ err }, 'error while closing server');
    await db.destroy().catch(() => {});
    process.exit(err ? 1 : 0);
  });
  server.closeIdleConnections();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
