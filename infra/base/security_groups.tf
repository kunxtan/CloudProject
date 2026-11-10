# Security Group ต่อกันเป็นโซ่ (SG chaining):
#   CloudFront ──:80──▶ alb-sg ──:3000──▶ app-sg ──:3306──▶ db-sg
# แต่ละชั้นรับ traffic จากชั้นก่อนหน้า "เท่านั้น" → ยิงตรงเข้า ALB / EC2 / RDS จาก internet ไม่ได้
#
# หมายเหตุ: Terraform จะลบกฎ egress "allow all" ที่ AWS ใส่ให้อัตโนมัติ
# จึงต้องเขียน egress เองทุกอันที่ต้องใช้

data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

resource "aws_security_group" "alb" {
  name        = "${var.project}-alb-sg"
  description = "ALB - HTTP from CloudFront only"
  vpc_id      = aws_vpc.main.id
  tags        = { Name = "${var.project}-alb-sg" }
}

resource "aws_security_group" "app" {
  name        = "${var.project}-app-sg"
  description = "App EC2 - port 3000 from ALB only, no SSH"
  vpc_id      = aws_vpc.main.id
  tags        = { Name = "${var.project}-app-sg" }
}

resource "aws_security_group" "db" {
  name        = "${var.project}-db-sg"
  description = "RDS - MySQL from app only"
  vpc_id      = aws_vpc.main.id
  tags        = { Name = "${var.project}-db-sg" }
}

# ---------- ALB ----------

resource "aws_vpc_security_group_ingress_rule" "alb_from_cloudfront" {
  security_group_id = aws_security_group.alb.id
  description       = "HTTP from CloudFront edge only"
  prefix_list_id    = data.aws_ec2_managed_prefix_list.cloudfront.id
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
}

resource "aws_vpc_security_group_egress_rule" "alb_to_app" {
  security_group_id            = aws_security_group.alb.id
  description                  = "Forward requests + health checks to app"
  referenced_security_group_id = aws_security_group.app.id
  ip_protocol                  = "tcp"
  from_port                    = 3000
  to_port                      = 3000
}

# ---------- EC2 (app) ----------

resource "aws_vpc_security_group_ingress_rule" "app_from_alb" {
  security_group_id            = aws_security_group.app.id
  description                  = "App port from ALB only"
  referenced_security_group_id = aws_security_group.alb.id
  ip_protocol                  = "tcp"
  from_port                    = 3000
  to_port                      = 3000
}

# EC2 ต้องออก internet ได้: pull image จาก ECR, อ่าน SSM, อัปโหลดไป S3, ส่ง log เข้า CloudWatch
resource "aws_vpc_security_group_egress_rule" "app_all_out" {
  security_group_id = aws_security_group.app.id
  description       = "Outbound HTTPS to AWS APIs, DB, package repos"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

# ---------- RDS ----------

resource "aws_vpc_security_group_ingress_rule" "db_from_app" {
  security_group_id            = aws_security_group.db.id
  description                  = "MySQL from app only"
  referenced_security_group_id = aws_security_group.app.id
  ip_protocol                  = "tcp"
  from_port                    = 3306
  to_port                      = 3306
}
# db-sg ไม่มี egress: SG เป็น stateful อยู่แล้ว (ตอบกลับ connection ที่เข้ามาได้เอง) และ DB ไม่ต้องเริ่มคุยกับใคร
