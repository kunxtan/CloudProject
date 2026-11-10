# ช่องทางแจ้งเตือน (SNS → email) — อยู่ใน base เพราะ stack app ถูกลบ/สร้างทุกวัน
# ถ้าอยู่ใน app ทุกคนจะต้องกดยืนยันอีเมลใหม่ทุกครั้งที่ apply
#
# ใส่อีเมลใน infra/base/terraform.tfvars (ไฟล์นี้ไม่ขึ้น git) เช่น
#   alarm_emails = ["a@example.com", "b@example.com"]

variable "alarm_emails" {
  description = "อีเมลที่รับแจ้งเตือนเมื่อระบบมีปัญหา (ต้องกดยืนยันในอีเมลที่ AWS ส่งไปก่อน)"
  type        = list(string)
  default     = []
}

resource "aws_sns_topic" "alerts" {
  name = "${var.project}-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  for_each = toset(var.alarm_emails)

  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = each.value
}

output "alerts_topic_arn" {
  value = aws_sns_topic.alerts.arn
}
