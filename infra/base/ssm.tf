# secrets สุ่มโดย Terraform แล้วเก็บใน SSM Parameter Store (SecureString = เข้ารหัสด้วย KMS)
# EC2 อ่านค่าเหล่านี้ตอนบูต → รหัสผ่านไม่เคยอยู่ในโค้ดหรือใน git
#
# ⚠️ ค่าที่สุ่มจะถูกบันทึกใน terraform state ด้วย → state bucket จึงต้องเป็น private + เข้ารหัส (ตั้งไว้แล้วในขั้นที่ 0)

resource "random_password" "db" {
  length  = 32
  special = false # ไม่ใช้อักขระพิเศษ กันปัญหา escape ใน shell / RDS ห้ามบางตัว ( / @ " )
}

resource "random_password" "jwt" {
  length  = 64
  special = false
}

resource "aws_ssm_parameter" "db_password" {
  name        = "/${var.project}/db_password"
  description = "RDS master password"
  type        = "SecureString"
  value       = random_password.db.result
}

resource "aws_ssm_parameter" "jwt_secret" {
  name        = "/${var.project}/jwt_secret"
  description = "Backend JWT signing secret"
  type        = "SecureString"
  value       = random_password.jwt.result
}

# image tag ที่ EC2 จะ pull ตอนบูต — deploy ใหม่ = อัปเดตค่านี้แล้ว instance refresh (ไม่ต้องแก้ Terraform)
resource "aws_ssm_parameter" "image_tag" {
  name        = "/${var.project}/image_tag"
  description = "Backend Docker image tag currently deployed"
  type        = "String"
  value       = "v1"

  # หลังจากนี้ค่าจะถูกเปลี่ยนโดยมือ/CI → Terraform ไม่ต้องเปลี่ยนกลับ
  lifecycle {
    ignore_changes = [value]
  }
}
