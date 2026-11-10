# Application Load Balancer — กระจาย request ไป EC2 ที่ "ผ่าน health check" เท่านั้น
#
# ชั้นป้องกัน 2 ชั้น:
#   1) alb-sg รับเฉพาะ IP ของ CloudFront (prefix list, ตั้งไว้ใน base)
#   2) listener รับเฉพาะ request ที่มี header ลับ X-Origin-Verify ซึ่ง CloudFront "ของเรา" ใส่มาให้
#      (กันคนอื่นสร้าง CloudFront ของตัวเองแล้วชี้มาที่ ALB เรา)

resource "random_password" "origin_verify" {
  length  = 32
  special = false
}

resource "aws_lb" "app" {
  name               = "${var.project}-alb"
  load_balancer_type = "application"
  internal           = false
  subnets            = local.base.public_subnet_ids
  security_groups    = [local.base.alb_security_group_id]

  drop_invalid_header_fields = true
  idle_timeout               = 60 # backend ตั้ง keepAliveTimeout = 65s ไว้แล้ว (ต้องนานกว่าค่านี้)
}

resource "aws_lb_target_group" "app" {
  name                 = "${var.project}-tg"
  port                 = 3000
  protocol             = "HTTP"
  vpc_id               = local.base.vpc_id
  target_type          = "instance"
  deregistration_delay = 30 # รอ request ที่ค้างอยู่ 30 วิ ก่อนถอดเครื่องออก (backend รองรับ graceful shutdown)

  health_check {
    path                = "/api/health" # liveness: ไม่เช็ค DB (ดูเหตุผลใน health.controller.js)
    matcher             = "200"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.app.arn
  port              = 80
  protocol          = "HTTP"

  # ไม่มี header ลับ → 403
  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "Forbidden"
      status_code  = "403"
    }
  }
}

resource "aws_lb_listener_rule" "from_cloudfront" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 1

  condition {
    http_header {
      http_header_name = "X-Origin-Verify"
      values           = [random_password.origin_verify.result]
    }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}
