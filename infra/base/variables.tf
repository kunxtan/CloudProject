variable "region" {
  description = "AWS region ของทั้งระบบ"
  type        = string
  default     = "ap-southeast-1"
}

variable "project" {
  description = "ชื่อโปรเจกต์ ใช้เป็น prefix ของชื่อ resource"
  type        = string
  default     = "hiwlaewq"
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "ALB + EC2 (AZ-a, AZ-b)"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "RDS (AZ-a, AZ-b)"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24"]
}

# ---------- RDS ----------

variable "rds_instance_class" {
  type    = string
  default = "db.t3.micro"
}

variable "rds_multi_az" {
  description = "true = มี standby อีก AZ (failover อัตโนมัติ) แต่ค่าใช้จ่าย x2 — เปิดเฉพาะวันเดโม"
  type        = bool
  default     = false
}

variable "rds_backup_retention_days" {
  description = "จำนวนวันที่เก็บ automated backup (บัญชี Free plan อาจจำกัดไว้ที่ 1 วัน)"
  type        = number
  default     = 1
}

variable "rds_deletion_protection" {
  description = "กันลบ DB โดยไม่ตั้งใจ — ตอนจบโปรเจกต์ค่อยเปลี่ยนเป็น false แล้วค่อย destroy"
  type        = bool
  default     = true
}

# ---------- S3 ----------

variable "upload_cors_origins" {
  description = "origin ที่ browser อัปโหลดรูปเข้า uploads bucket ได้ (presigned POST มีลายเซ็นกำกับอยู่แล้ว) — หลังได้ CloudFront URL ค่อยเปลี่ยนให้แคบลง"
  type        = list(string)
  default     = ["*"]
}
