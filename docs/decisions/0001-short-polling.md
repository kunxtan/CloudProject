# ADR-0001: อัปเดตสถานะคิวด้วย short polling ทุก 5 วินาที แทน WebSocket

- สถานะ: ใช้งาน
- วันที่: 2026-11

## บริบท

ลูกค้าต้องเห็นลำดับคิว เวลารอโดยประมาณ และการแจ้งเตือน "ใกล้ถึงคิว / ถึงคิวแล้ว" โดยไม่ต้องกด refresh ส่วนพนักงานต้องเห็นคิวใหม่เข้ามาในหน้า dashboard

backend รันหลาย instance หลัง ALB (อย่างน้อย 2 เครื่อง คนละ AZ — ดู [ADR-0004](0004-ec2-asg-docker.md)) และเครื่องถูกลบ/สร้างใหม่ได้ทุกเมื่อ (ASG, rolling deploy) ระบบจึงต้อง **stateless**

## การตัดสินใจ

ใช้ **short polling ทุก 5 วินาที** ผ่าน REST API ปกติ (`usePolling` ใน frontend)

- ลูกค้า: `GET /api/queues/me` + `GET /api/notifications?unread=true`
- พนักงาน: `GET /api/staff/.../queues`
- แจ้งเตือนเก็บใน DB แล้วแสดงด้วย in-app toast + Browser Notification API

## ทางเลือกที่พิจารณา

| | Short polling (เลือก) | WebSocket / Socket.IO | Server-Sent Events |
|---|---|---|---|
| Stateless | ✅ request ไหนไปเครื่องไหนก็ได้ | ❌ connection ผูกกับเครื่อง | ❌ connection ผูกกับเครื่อง |
| หลายเครื่องหลัง ALB | ✅ ใช้ได้ทันที | ต้องมี Redis pub/sub (ElastiCache) ให้ทุกเครื่องเห็น event เดียวกัน | ต้องมี Redis pub/sub เช่นกัน |
| ตอน deploy / เครื่องดับ | ไม่มีผล — poll รอบถัดไปไปเครื่องอื่น | connection หลุดทุกคน ต้อง reconnect พร้อมกัน | เหมือน WebSocket |
| ความหน่วง | ช้าสุด ~5 วิ | ทันที | ทันที |
| ภาระ server | 500 ผู้ใช้ ≈ 200 req/s | น้อยกว่ามาก | น้อยกว่ามาก |
| ค่าใช้จ่ายเพิ่ม | 0 | ElastiCache ~$12+/เดือน | ElastiCache |

## ผลที่ตามมา

**ได้**

- ระบบ stateless จริง — rolling deploy และ failover ไม่กระทบผู้ใช้ที่เปิดหน้าค้างไว้ (ผลทดสอบ: deploy ระหว่างมีผู้ใช้ 500 คน error 0% — [runbook §6.3](../runbook.md))
- ไม่มี infra เพิ่ม โค้ดเรียบง่าย ทดสอบง่าย (เป็น REST ธรรมดา)
- ทนต่อ request ที่พังเป็นครั้งคราว — รอบถัดไปก็ได้ข้อมูลใหม่

**เสีย**

- ช้าสุด 5 วินาที — ยอมรับได้สำหรับร้านอาหาร (คิวขยับทีละหลายนาที)
- request เยอะกว่า: 500 ผู้ใช้ × 2 request ÷ 5 วิ ≈ **200 req/s**
  - ผล load test: p95 ที่ server 6–9 ms, EC2 CPU ~13%, RDS CPU ~12% — ยังเหลือ headroom มาก ([runbook §6.1](../runbook.md))

**จะเปลี่ยนใจเมื่อ**

- ผู้ใช้โตจน DB เป็นคอขวด → ขั้นแรก cache ผลของ endpoint ที่ถูก poll (TTL 2–3 วิ) ก่อน
- ต้องการ latency ระดับวินาที → เปลี่ยนเป็น SSE/WebSocket + ElastiCache Redis pub/sub
