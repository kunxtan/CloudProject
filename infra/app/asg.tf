# Auto Scaling Group — รักษาจำนวนเครื่องให้ครบเสมอ กระจาย 2 AZ
#   - เครื่องไหน health check ไม่ผ่าน (ดูจาก ALB) → ลบทิ้งแล้วสร้างใหม่อัตโนมัติ
#   - CPU เฉลี่ยสูง → เพิ่มเครื่อง (สูงสุด asg_max)
#   - launch template เปลี่ยน → ทยอยเปลี่ยนเครื่องทีละตัว (rolling, ไม่มี downtime)

resource "aws_autoscaling_group" "app" {
  name                = "${var.project}-asg"
  min_size            = var.asg_min
  max_size            = var.asg_max
  desired_capacity    = var.asg_desired
  vpc_zone_identifier = local.base.public_subnet_ids
  target_group_arns   = [aws_lb_target_group.app.arn]

  health_check_type         = "ELB"
  health_check_grace_period = var.health_check_grace_seconds

  launch_template {
    id      = aws_launch_template.app.id
    version = aws_launch_template.app.latest_version
  }

  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
      instance_warmup        = 120
    }
  }

  tag {
    key                 = "Name"
    value               = "${var.project}-app"
    propagate_at_launch = true
  }
}

resource "aws_autoscaling_policy" "cpu" {
  name                   = "${var.project}-cpu-target"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = var.cpu_target_percent
  }
}
