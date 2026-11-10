# MySQL 8.4 อยู่ใน private subnet, ไม่เปิด public, เข้ารหัสข้อมูล
# DB subnet group ครอบ 2 AZ ไว้แล้ว → เปิด Multi-AZ ได้แค่เปลี่ยน var.rds_multi_az = true

resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-db-subnets"
  subnet_ids = aws_subnet.private[*].id
  tags       = { Name = "${var.project}-db-subnets" }
}

resource "aws_db_instance" "main" {
  identifier = "${var.project}-db"

  engine                     = "mysql"
  engine_version             = "8.4"
  auto_minor_version_upgrade = true
  instance_class             = var.rds_instance_class

  allocated_storage = 20
  storage_type      = "gp3"
  storage_encrypted = true # encryption at rest (ใช้ key aws/rds ฟรี)

  db_name  = var.project # สร้าง database "hiwlaewq" ให้เลย
  username = var.project
  password = random_password.db.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]
  publicly_accessible    = false
  multi_az               = var.rds_multi_az

  backup_retention_period = var.rds_backup_retention_days
  backup_window           = "19:00-20:00"         # = 02:00-03:00 เวลาไทย
  maintenance_window      = "sun:20:00-sun:21:00" # = จันทร์ 03:00-04:00 เวลาไทย
  copy_tags_to_snapshot   = true

  deletion_protection = var.rds_deletion_protection
  skip_final_snapshot = true # โปรเจกต์เรียน: ตอนลบทิ้งไม่ต้องเก็บ snapshot (snapshot ก็คิดเงิน)
  apply_immediately   = true # เปลี่ยนค่า (เช่น multi_az) แล้วมีผลทันที ไม่รอ maintenance window

  tags = { Name = "${var.project}-db" }
}
