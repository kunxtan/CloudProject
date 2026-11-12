# ADR-0005: Health check ของ ALB ไม่เช็ค DB (liveness แยกจาก readiness)

- สถานะ: ใช้งาน
- วันที่: 2026-11

## บริบท

ALB ใช้ health check ตัดสินว่าจะส่ง request ให้เครื่องไหน และ ASG ใช้ผลเดียวกัน (`health_check_type = "ELB"`) ตัดสินว่าจะ **ลบเครื่องทิ้งแล้วสร้างใหม่** หรือไม่

ถ้า health check เช็ค DB ด้วย แล้ว DB ล่มหรือช้าชั่วคราว (เช่น RDS restart, failover, connection เต็ม) → **ทุกเครื่องไม่ผ่านพร้อมกัน** → ALB ไม่มีเครื่องให้ส่ง และ ASG ลบเครื่องทิ้งทั้งหมดแล้วสร้างใหม่วนไปเรื่อยๆ ทั้งที่ตัวเครื่องไม่ได้ผิด ปัญหาเล็กที่ DB จึงลามเป็นระบบล่มทั้งหมด (cascading failure)

## การตัดสินใจ

แยก health check เป็น 2 endpoint:

| Endpoint | ประเภท | เช็คอะไร | ใครใช้ |
|---|---|---|---|
| `GET /api/health` | **Liveness** | process ยังตอบ HTTP ได้ (ไม่แตะ DB) | ALB target group / ASG |
| `GET /api/health/ready` | **Readiness** | ต่อ DB ได้ (`SELECT 1`) | คนตอน debug / monitoring |

ค่าที่ตั้งใน target group: เช็คทุก **10 วิ**, timeout 5 วิ, ไม่ผ่าน **2 ครั้ง** = unhealthy, ผ่าน 2 ครั้ง = healthy

## ทางเลือกที่พิจารณา

- **เช็ค DB ใน health check ของ ALB** — ตรวจจับเครื่องที่ต่อ DB ไม่ได้ (เช่น config ผิด) ได้ แต่เสี่ยง cascading failure ข้างบน ซึ่งเลวร้ายกว่ามาก
- **ใช้ health check แบบ TCP** — ง่ายสุด แต่จับไม่ได้ถ้า process ค้างแต่ port ยังเปิด

## ผลที่ตามมา

**ได้**

- DB ล่ม → เครื่อง app ไม่ถูกลบ · เมื่อ DB กลับมาก็ใช้งานต่อได้ทันที
- เครื่องที่ดับหรือค้างจริงถูกตัดออกภายใน ~10–20 วิ (ผลทดสอบ failover: error window ~13 วิ — [runbook §6.2](../runbook.md))

**เสีย**

- เครื่องที่ process ยังทำงานแต่ต่อ DB ไม่ได้ (เช่น env ผิดเฉพาะเครื่อง) จะยังได้รับ traffic → ต้องเฝ้าด้วย alarm `hiwlaewq-5xx-high` แทน
  - ในทางปฏิบัติความเสี่ยงต่ำ: container รัน migration ก่อน start server ถ้าต่อ DB ไม่ได้ server จะไม่ start และ health check ก็ไม่ผ่านเอง

**ปรับจูน**

- ลด interval เป็น 5 วิ → ตัดเครื่องที่พังได้เร็วขึ้นครึ่งหนึ่ง แลกกับ health check request ที่มากขึ้น
