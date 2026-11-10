# Monitoring: log + dashboard + alarms (แจ้งเตือนผ่าน SNS topic ที่อยู่ใน base)
# ค่าใช้จ่าย: อยู่ในโควตาฟรี (dashboard 3 อัน, alarm 10 ตัว — ตรงนี้ 4 + อีก 2 ที่ target tracking ของ ASG สร้างเอง)

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/${var.project}/backend"
  retention_in_days = 7
}

locals {
  alerts_topic = [local.base.alerts_topic_arn]
  alb_dim      = aws_lb.app.arn_suffix
  tg_dim       = aws_lb_target_group.app.arn_suffix
  asg_name     = aws_autoscaling_group.app.name
  db_id        = local.base.db_identifier
}

# ---------- alarms ----------

# เครื่องที่พร้อมรับงานเหลือไม่ถึง 2 นาน 5 นาที (ปกติต้องมี 2 — เผื่อเวลาเครื่องใหม่บูต)
resource "aws_cloudwatch_metric_alarm" "healthy_hosts" {
  alarm_name          = "${var.project}-healthy-hosts-low"
  alarm_description   = "Healthy EC2 behind the ALB dropped below 2"
  namespace           = "AWS/ApplicationELB"
  metric_name         = "HealthyHostCount"
  dimensions          = { LoadBalancer = local.alb_dim, TargetGroup = local.tg_dim }
  statistic           = "Minimum"
  period              = 60
  evaluation_periods  = 5
  comparison_operator = "LessThanThreshold"
  threshold           = 2
  treat_missing_data  = "breaching"
  alarm_actions       = local.alerts_topic
  ok_actions          = local.alerts_topic
}

# backend ตอบ 5xx เกิน 10 ครั้งใน 5 นาที
resource "aws_cloudwatch_metric_alarm" "target_5xx" {
  alarm_name          = "${var.project}-5xx-high"
  alarm_description   = "Backend returned more than 10 5xx responses in 5 minutes"
  namespace           = "AWS/ApplicationELB"
  metric_name         = "HTTPCode_Target_5XX_Count"
  dimensions          = { LoadBalancer = local.alb_dim }
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  comparison_operator = "GreaterThanThreshold"
  threshold           = 10
  treat_missing_data  = "notBreaching" # ไม่มี error = ไม่มีข้อมูล = ปกติ
  alarm_actions       = local.alerts_topic
  ok_actions          = local.alerts_topic
}

resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "${var.project}-rds-cpu-high"
  alarm_description   = "RDS CPU above 80% for 10 minutes"
  namespace           = "AWS/RDS"
  metric_name         = "CPUUtilization"
  dimensions          = { DBInstanceIdentifier = local.db_id }
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 2
  comparison_operator = "GreaterThanThreshold"
  threshold           = 80
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alerts_topic
  ok_actions          = local.alerts_topic
}

resource "aws_cloudwatch_metric_alarm" "rds_storage" {
  alarm_name          = "${var.project}-rds-storage-low"
  alarm_description   = "RDS free storage below 2 GB"
  namespace           = "AWS/RDS"
  metric_name         = "FreeStorageSpace"
  dimensions          = { DBInstanceIdentifier = local.db_id }
  statistic           = "Minimum"
  period              = 300
  evaluation_periods  = 1
  comparison_operator = "LessThanThreshold"
  threshold           = 2 * 1024 * 1024 * 1024
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alerts_topic
  ok_actions          = local.alerts_topic
}

# ---------- dashboard ----------

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = var.project

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric", x = 0, y = 0, width = 8, height = 6
        properties = {
          title   = "Traffic (requests/min)"
          region  = var.region
          stat    = "Sum"
          period  = 60
          metrics = [["AWS/ApplicationELB", "RequestCount", "LoadBalancer", local.alb_dim]]
        }
      },
      {
        type = "metric", x = 8, y = 0, width = 8, height = 6
        properties = {
          title  = "Errors (4xx / 5xx)"
          region = var.region
          stat   = "Sum"
          period = 60
          metrics = [
            ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", local.alb_dim, { label = "5xx", color = "#d62728" }],
            ["AWS/ApplicationELB", "HTTPCode_Target_4XX_Count", "LoadBalancer", local.alb_dim, { label = "4xx", color = "#ff7f0e" }],
          ]
        }
      },
      {
        type = "metric", x = 16, y = 0, width = 8, height = 6
        properties = {
          title  = "Latency (seconds)"
          region = var.region
          period = 60
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", local.alb_dim, { stat = "p50", label = "p50" }],
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", local.alb_dim, { stat = "p95", label = "p95" }],
          ]
        }
      },
      {
        type = "metric", x = 0, y = 6, width = 8, height = 6
        properties = {
          title   = "Healthy EC2"
          region  = var.region
          stat    = "Minimum"
          period  = 60
          metrics = [["AWS/ApplicationELB", "HealthyHostCount", "LoadBalancer", local.alb_dim, "TargetGroup", local.tg_dim]]
          yAxis   = { left = { min = 0 } }
        }
      },
      {
        type = "metric", x = 8, y = 6, width = 8, height = 6
        properties = {
          title   = "EC2 CPU % (ASG average)"
          region  = var.region
          stat    = "Average"
          period  = 300
          metrics = [["AWS/EC2", "CPUUtilization", "AutoScalingGroupName", local.asg_name]]
          yAxis   = { left = { min = 0, max = 100 } }
        }
      },
      {
        type = "metric", x = 16, y = 6, width = 8, height = 6
        properties = {
          title  = "RDS"
          region = var.region
          stat   = "Average"
          period = 300
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", local.db_id, { label = "CPU %" }],
            ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", local.db_id, { label = "Connections", yAxis = "right" }],
          ]
        }
      },
      {
        type = "log", x = 0, y = 12, width = 24, height = 6
        properties = {
          title  = "Backend errors (ล่าสุด 20 รายการ)"
          region = var.region
          query  = "SOURCE '${aws_cloudwatch_log_group.backend.name}' | fields @timestamp, @logStream, msg, err.message | filter level >= 50 | sort @timestamp desc | limit 20"
          view   = "table"
        }
      },
    ]
  })
}
