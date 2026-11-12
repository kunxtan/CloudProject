# ADR-0002: วาง EC2 ใน public subnet และไม่ใช้ NAT Gateway

- สถานะ: ใช้งาน
- วันที่: 2026-11

## บริบท

EC2 ต้องออกอินเทอร์เน็ตได้ เพื่อ pull Docker image จาก ECR, อ่านค่าจาก SSM, ส่ง log ไป CloudWatch และติดตั้ง Docker ตอนบูต

แบบ "ตำรา" คือวาง EC2 ใน private subnet แล้วออกเน็ตผ่าน NAT Gateway แต่ NAT Gateway คิด **~$32/เดือนต่อ AZ + ค่า data processing** ซึ่งแพงกว่า EC2 ทั้ง 2 เครื่องรวมกัน และโปรเจกต์มีเครดิตจำกัด (~$200)

## การตัดสินใจ

- วาง EC2 ใน **public subnet** (มี public IP) — ออกเน็ตผ่าน Internet Gateway ได้โดยตรง
- **ล็อกขาเข้าด้วย Security Group** แทนการซ่อนใน private subnet:
  - `app-sg` รับเฉพาะ port 3000 **จาก `alb-sg` เท่านั้น** — ไม่เปิด port 22 (ไม่มี SSH)
  - เข้าเครื่องเพื่อ debug ผ่าน **SSM Session Manager** (ผ่าน IAM ไม่ต้องเปิด port)
- RDS ยังอยู่ใน **private subnet** (`publicly_accessible = false`) รับ 3306 จาก `app-sg` เท่านั้น
- ALB รับ port 80 จาก **CloudFront managed prefix list** เท่านั้น + ตรวจ secret header จาก CloudFront — ยิงตรงเข้า ALB ไม่ได้

## ทางเลือกที่พิจารณา

| ทางเลือก | ค่าใช้จ่าย/เดือน | เหตุผลที่ไม่เลือก |
|---|---|---|
| Private subnet + NAT Gateway 2 AZ | ~$65 + data | แพงเกินงบ เกือบเท่าค่าระบบทั้งหมด |
| Private subnet + NAT Gateway 1 AZ | ~$32 + data | ยังแพง และ NAT กลายเป็น single point of failure ข้าม AZ |
| Private subnet + VPC Endpoints (ECR, S3, SSM, Logs) | ~$7/endpoint/AZ → ~$60+ | แพงพอๆ กับ NAT และ `dnf install docker` ยังต้องออกเน็ต |
| NAT instance (EC2 ทำ NAT เอง) | ~$4 | ต้องดูแลเอง เป็น SPOF และเพิ่มความซับซ้อน |
| **Public subnet + SG chaining (เลือก)** | ค่า public IPv4 ~$3.6/เครื่อง | — |

## ผลที่ตามมา

**ได้**

- ประหยัด ~$32–65/เดือน
- ในทางปฏิบัติปลอดภัยเทียบเท่า: ขาเข้าถูก SG ปิดทุก port ยกเว้น 3000 จาก ALB · ไม่มี SSH · ไม่มี credential บนเครื่อง (ใช้ IAM Role)

**เสีย**

- เครื่องมี public IP → ถ้ามีคนแก้ SG ผิด เครื่องจะโดนเข้าถึงจากอินเทอร์เน็ตได้ทันที (private subnet ให้การป้องกันชั้นที่ 2) — ลดความเสี่ยงโดยจัดการ SG ผ่าน Terraform เท่านั้น
- ขาออกไม่ถูกจำกัด (`app-sg` egress เปิดทุก port ไปทุกที่ เพื่อให้ต่อ AWS API, RDS และ package repo ได้) — ถ้าเครื่องถูกเจาะ ก็ส่งข้อมูลออกได้ · ปรับให้เข้มขึ้นได้โดยจำกัดเหลือ 443 ไปอินเทอร์เน็ต และ 3306 ไป `db-sg`

**จะเปลี่ยนใจเมื่อ**

- ใช้งานจริง / มีข้อกำหนดด้าน compliance → ย้าย EC2 ไป private subnet + NAT Gateway (หรือ VPC endpoints) — Terraform แยก subnet ไว้แล้ว แก้แค่ `vpc_zone_identifier` ของ ASG และเพิ่ม NAT
