# ---------- deps: ติดตั้งเฉพาะ production dependencies ----------
FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---------- runtime ----------
FROM node:24-slim
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

# รันด้วย user ที่ไม่ใช่ root
USER node
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# 1) migrate (มี retry + lock กันชนกันระหว่างหลายเครื่อง)  2) exec ให้ node เป็น PID 1 → รับ SIGTERM ตรงๆ
CMD ["sh", "-c", "node src/db/migrate.js && exec node src/server.js"]
