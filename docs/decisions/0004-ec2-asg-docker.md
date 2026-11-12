# ADR-0004: รัน backend เป็น Docker บน EC2 + Auto Scaling Group แทน ECS / Lambda

- สถานะ: ใช้งาน
- วันที่: 2026-11

## บริบท

backend เป็น Node.js (Express) ที่ต้องรันตลอดเวลาเพื่อรับ polling (~200 req/s ที่ 500 ผู้ใช้ — ดู [ADR-0001](0001-short-polling.md)) และต้อง:

- ทนต่อเครื่องหรือ AZ ล่ม
- deploy เวอร์ชันใหม่ได้โดยไม่มี downtime
- ประหยัดเครดิต และทีมต้องเข้าใจการทำงานระดับ VM / network สำหรับวิชานี้

## การตัดสินใจ

- แพ็ก backend เป็น **Docker image** เก็บใน **ECR** (tag = git SHA)
- รันบน **EC2 `t3.micro` ใน Auto Scaling Group**: min 2 / desired 2 / max 3 กระจาย 2 AZ หลัง **ALB**
  - `health_check_type = "ELB"` — เครื่องที่ ALB เห็นว่าไม่ healthy จะถูกแทนที่อัตโนมัติ
  - Target tracking: CPU เฉลี่ย 60% → scale out ถึง 3 เครื่อง
- ตอนบูต `user_data` อ่าน image tag จาก SSM → pull → `docker run` (container migrate DB ก่อน start)
- Deploy = อัปเดต tag ใน SSM + **instance refresh** แบบ rolling (`MinHealthyPercentage = 50`) — ไม่ต้องแก้ launch template
- เครื่องไม่มี state: session = JWT, รูป = S3, ข้อมูล = RDS → ลบเครื่องทิ้งได้ตลอด

## ทางเลือกที่พิจารณา

| ทางเลือก | ข้อดี | เหตุผลที่ไม่เลือก |
|---|---|---|
| **EC2 + ASG + Docker (เลือก)** | เข้าใจทุกชั้น (VM, AMI, user_data, SG, ASG, ALB) · ราคาถูกเมื่อรันตลอด | ต้องดูแล OS / patch เอง (ลดด้วยการใช้ AMI ล่าสุดทุกครั้งที่สร้างเครื่อง) |
| ECS on Fargate | ไม่ต้องดูแลเครื่อง, deploy ง่ายกว่า | แพงกว่าสำหรับงานที่รันตลอด 24 ชม. (~$9/task/เดือนสำหรับ 0.25 vCPU) และซ่อนรายละเอียดที่ต้องการเรียนรู้ |
| ECS on EC2 | ใช้ ASG เหมือนกัน | เพิ่มอีกชั้น (ECS agent, task definition) โดยไม่ได้ประโยชน์มากที่ขนาดนี้ |
| Lambda + API Gateway | จ่ายตามใช้งาน, scale อัตโนมัติ | poll ทุก 5 วิตลอดเวลา → invocation เยอะ · connection pool กับ MySQL จัดการยาก (ต้องใช้ RDS Proxy เพิ่ม) · cold start |
| Elastic Beanstalk | ตั้งค่าง่าย | ซ่อนทุกอย่าง อธิบายสถาปัตยกรรมได้ยาก |

## ผลที่ตามมา

**ได้** — พิสูจน์ด้วยการทดสอบจริง ([runbook §6](../runbook.md))

- **Failover:** ปิดเครื่อง 1 ใน 2 ระหว่างมีผู้ใช้ 500 คน → error เฉพาะ ~13 วิแรก (1.1% ของทั้งรอบ) เครื่องที่เหลือรับงานต่อ และ ASG สร้างเครื่องทดแทนครบใน ~4 นาที
- **Zero-downtime deploy:** instance refresh ระหว่างมีผู้ใช้ 500 คน → error **0** ใน 247,367 request
- **Rollback:** เปลี่ยน image tag ใน SSM กลับเป็น SHA เดิม → instance refresh

**เสีย**

- เครื่องใหม่ใช้ ~2–3 นาทีกว่าจะพร้อม (ติดตั้ง Docker ทุกครั้งที่บูต) → deploy 2 เครื่องใช้ ~6 นาที · ลดได้ด้วย AMI ที่ติดตั้ง Docker ไว้แล้ว
- ต้องดูแล OS patch เอง

**จะเปลี่ยนใจเมื่อ**

- ทีมไม่อยากดูแลเครื่อง หรือมีหลาย service → ย้ายไป **ECS Fargate** ได้ง่าย เพราะเป็น Docker image อยู่แล้ว (ใช้ image, ALB, SSM เดิม)
