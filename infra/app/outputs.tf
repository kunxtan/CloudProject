output "cloudfront_url" {
  description = "URL ของเว็บ — เปิดอันนี้ใน browser"
  value       = "https://${aws_cloudfront_distribution.main.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "ใช้ตอนสั่ง invalidation หลัง deploy frontend"
  value       = aws_cloudfront_distribution.main.id
}

output "alb_dns_name" {
  description = "เปิดตรงๆ จะได้ 403 (ถูกต้อง — ต้องเข้าผ่าน CloudFront เท่านั้น)"
  value       = aws_lb.app.dns_name
}

output "asg_name" {
  value = aws_autoscaling_group.app.name
}

output "frontend_bucket" {
  value = local.base.frontend_bucket
}

output "log_group" {
  value = aws_cloudwatch_log_group.backend.name
}
