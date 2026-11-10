# log ของ backend (Docker awslogs driver ส่งมาที่นี่ — 1 stream ต่อ 1 เครื่อง)
# dashboard + alarms จะเพิ่มในขั้น Monitoring

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/${var.project}/backend"
  retention_in_days = 7
}
