# ค่าที่ stack app (ขั้นที่ 2) จะอ่านผ่าน terraform_remote_state และที่ใช้ตอน push image

output "region" {
  value = var.region
}

output "account_id" {
  value = local.account_id
}

# ---------- network ----------

output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}

output "alb_security_group_id" {
  value = aws_security_group.alb.id
}

output "app_security_group_id" {
  value = aws_security_group.app.id
}

# ---------- database ----------

output "db_identifier" {
  value = aws_db_instance.main.identifier
}

output "db_host" {
  value = aws_db_instance.main.address
}

output "db_port" {
  value = aws_db_instance.main.port
}

output "db_name" {
  value = aws_db_instance.main.db_name
}

output "db_username" {
  value = aws_db_instance.main.username
}

# ---------- storage ----------

output "frontend_bucket" {
  value = aws_s3_bucket.frontend.bucket
}

output "frontend_bucket_arn" {
  value = aws_s3_bucket.frontend.arn
}

output "frontend_bucket_domain" {
  value = aws_s3_bucket.frontend.bucket_regional_domain_name
}

output "uploads_bucket" {
  value = aws_s3_bucket.uploads.bucket
}

output "uploads_bucket_arn" {
  value = aws_s3_bucket.uploads.arn
}

output "uploads_bucket_domain" {
  value = aws_s3_bucket.uploads.bucket_regional_domain_name
}

# ---------- container + secrets ----------

output "ecr_repository_url" {
  value = aws_ecr_repository.backend.repository_url
}

output "ecr_repository_arn" {
  value = aws_ecr_repository.backend.arn
}

output "ssm_parameter_arns" {
  description = "EC2 role ต้องมีสิทธิ์อ่านพารามิเตอร์เหล่านี้"
  value = [
    aws_ssm_parameter.db_password.arn,
    aws_ssm_parameter.jwt_secret.arn,
    aws_ssm_parameter.image_tag.arn,
  ]
}

output "ssm_prefix" {
  value = "/${var.project}"
}
