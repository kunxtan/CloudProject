# hiwlaewQ ระบบจองคิวร้านอาหารออนไลน์: ลูกค้าจองคิวผ่านมือถือและดูสถานะแบบเรียลไทม์ ส่วนร้านมี dashboard ไว้เรียกคิว จัดโต๊ะ และดูสถิติ

**Stack:** React (Vite) · Node.js (Express) · MySQL · AWS (CloudFront, S3, ALB, EC2 Auto Scaling, RDS)

---

## รันบนเครื่องตัวเอง

ต้องมี **Node.js 24+** และ **Docker Desktop**

```bash
# 1) MySQL (port 3307)
docker compose up -d mysql

# 2) Backend → http://localhost:3000
cd backend
cp .env.example .env
npm install
npm run seed        # สร้างตาราง + ข้อมูลตัวอย่าง (ล้างข้อมูลเดิม)
npm run dev

# 3) Frontend → http://localhost:5173  (อีก terminal)
cd frontend
npm install
npm run dev
```

### บัญชีทดลอง (รหัสผ่าน `password123`)

| อีเมล | บทบาท |
|---|---|
| `customer@hiwlaewq.dev` | ลูกค้า (ยังไม่มีคิว ลองจองได้เลย) |
| `owner2@hiwlaewq.dev` | เจ้าของร้าน "ชาบูหิวแหลก" (มีคิวรออยู่แล้ว) |
| `staff@hiwlaewq.dev` | พนักงานร้าน "ชาบูหิวแหลก" |
| `owner1@`, `owner3@`, `owner4@hiwlaewq.dev` | เจ้าของร้านอื่น |

---

## ทดสอบ

```bash
cd backend
npm test            # unit + integration (ต้องรัน docker compose up -d mysql ก่อน)
npm run test:unit   # เฉพาะ unit test (ไม่ต้องใช้ DB)
```


## โครงสร้าง

```
backend/src
├── routes/        API Layer: กำหนด endpoint + middleware
├── controllers/   แปลง request → เรียก service → ส่ง response
├── services/      Service Layer: business logic ทั้งหมด
├── repositories/  Data Access Layer: SQL (Knex) อยู่ที่นี่ที่เดียว
├── middlewares/   auth (JWT), role, validate (zod), error handler
├── validators/    zod schemas
└── db/            migrations, migrate.js, seed.js

frontend/src
├── api/           axios client + endpoints + upload
├── context/       Auth, Toast
├── hooks/         usePolling, useNotifications
├── components/    UI ที่ใช้ซ้ำ
└── pages/         auth / customer / staff
```

## Environment variables (backend)

ดู [backend/.env.example](backend/.env.example) ค่าที่ต้องเปลี่ยนตอนขึ้น production:

| ตัวแปร | production |
|---|---|
| `DB_HOST`, `DB_PASSWORD` | endpoint ของ RDS และรหัสผ่าน (เก็บใน SSM Parameter Store) |
| `DB_SSL` | `rds` |
| `JWT_SECRET` | สุ่มยาว ≥ 32 ตัวอักษร (เก็บใน SSM Parameter Store) |
| `STORAGE_DRIVER` / `S3_BUCKET` | `s3` / ชื่อ uploads bucket |
| `TRUST_PROXY` | `2` (CloudFront + ALB) |
