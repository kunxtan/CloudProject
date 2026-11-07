import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// dev: ส่ง /api และ /uploads ไปที่ backend → frontend กับ API อยู่โดเมนเดียวกัน (เหมือนตอนอยู่หลัง CloudFront)
const BACKEND = process.env.VITE_BACKEND_URL ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': BACKEND,
      '/uploads': BACKEND,
    },
  },
});
