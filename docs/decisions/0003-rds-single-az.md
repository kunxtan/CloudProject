# ADR-0003: RDS แบบ single-AZ ที่พร้อมเปิด Multi-AZ ด้วยตัวแปรเดียว

- สถานะ: ใช้งาน
- วันที่: 2026-11

## บริบท

app tier กระจาย 2 AZ แล้ว (ASG min 2) แต่ DB เป็นจุดที่ทุก request ต้องผ่าน ถ้า DB ล่ม ระบบใช้งานไม่ได้

RDS Multi-AZ มี standby อีก AZ ที่ sync แบบ synchronous และ failover อัตโนมัติ แต่ **ค่าใช้จ่าย RDS เป็น 2 เท่า** (~$20 → ~$40/เดือน สำหรับ `db.t3.micro`)

## การตัดสินใจ

- ใช้ RDS MySQL 8 `db.t3.micro` แบบ **single-AZ** ระหว่างพัฒนาและทดสอบ
- เตรียมทุกอย่างให้เปิด Multi-AZ ได้ทันที:
  - DB subnet group ครอบ **2 private subnet คนละ AZ** ไว้แล้ว
  - ตัวแปร `rds_multi_az` ใน `infra/base` — เปลี่ยนเป็น `true` แล้ว `terraform apply` (`apply_immediately = true` มีผลทันที ไม่ต้องรอ maintenance window)
- ป้องกันข้อมูล: encryption at rest, automated backup + point-in-time restore, `deletion_protection = true`

## ทางเลือกที่พิจารณา

| ทางเลือก | ค่าใช้จ่าย | เหตุผล |
|---|---|---|
| **Single-AZ + พร้อมเปิด Multi-AZ (เลือก)** | ~$20/เดือน | เหมาะกับช่วงพัฒนา เครดิตจำกัด |
| Multi-AZ ตลอด | ~$40/เดือน | ไม่คุ้มสำหรับระบบที่ยังไม่มีผู้ใช้จริง |
| Aurora Serverless v2 | ขั้นต่ำ ~$45+/เดือน | แพงกว่าและเกินความต้องการ |
| MySQL บน EC2 เอง | ถูกกว่าเล็กน้อย | ต้องดูแล backup / patch / failover เอง |

## ผลที่ตามมา

**ได้**

- ประหยัด ~50% ของค่า DB
- ย้ายไป Multi-AZ ได้ด้วยการแก้ 1 บรรทัด ไม่ต้องย้ายข้อมูล

**เสีย — DB เป็น single point of failure**

| เหตุการณ์ | ผลกระทบ (single-AZ) | ถ้าเปิด Multi-AZ |
|---|---|---|
| DB instance / AZ ของ DB ล่ม | ระบบใช้งานไม่ได้จนกว่า DB กลับมา หรือ restore ใหม่ (RTO ~15–30 นาที) | failover อัตโนมัติ ~1–2 นาที |
| ข้อมูลเสีย / ลบผิด | point-in-time restore (RPO ~5 นาที) | เหมือนกัน — Multi-AZ ไม่ช่วยเรื่องนี้ |

- backup เก็บ `rds_backup_retention_days` วัน (ค่าเริ่มต้น **1 วัน** เพราะบัญชี Free plan จำกัด) — ใช้งานจริงควรเป็น 7 วันขึ้นไป
- app ไม่ถูกลบทิ้งตอน DB ล่ม เพราะ health check ไม่เช็ค DB ([ADR-0005](0005-liveness-health-check.md)) → DB กลับมาเมื่อไหร่ใช้งานต่อได้ทันที

**จะเปลี่ยนใจเมื่อ**

- เปิดให้ผู้ใช้จริง → เปิด `rds_multi_az = true`
- อ่านหนักจน DB เป็นคอขวด → เพิ่ม Read Replica สำหรับ endpoint ที่ถูก poll และหน้าสถิติ
