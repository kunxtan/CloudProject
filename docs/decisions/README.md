# Architecture Decision Records (ADR)

บันทึกการตัดสินใจเชิงสถาปัตยกรรมที่สำคัญ — 1 เรื่องต่อ 1 ไฟล์ เขียนในรูปแบบ:

- **บริบท** — ปัญหาหรือข้อจำกัดที่ต้องตัดสินใจ
- **การตัดสินใจ** — เลือกอะไร
- **ทางเลือกที่พิจารณา** — ทำไมไม่เลือกตัวอื่น
- **ผลที่ตามมา** — ได้อะไร เสียอะไร (trade-off) และจะเปลี่ยนใจเมื่อไหร่

| # | เรื่อง | สถานะ |
|---|---|---|
| [0001](0001-short-polling.md) | อัปเดตสถานะคิวด้วย short polling ทุก 5 วินาที แทน WebSocket | ใช้งาน |
| [0002](0002-no-nat-gateway.md) | วาง EC2 ใน public subnet และไม่ใช้ NAT Gateway | ใช้งาน |
| [0003](0003-rds-single-az.md) | RDS แบบ single-AZ ที่พร้อมเปิด Multi-AZ ด้วยตัวแปรเดียว | ใช้งาน |
| [0004](0004-ec2-asg-docker.md) | รัน backend เป็น Docker บน EC2 + Auto Scaling Group แทน ECS / Lambda | ใช้งาน |
| [0005](0005-liveness-health-check.md) | Health check ของ ALB ไม่เช็ค DB (liveness แยกจาก readiness) | ใช้งาน |
