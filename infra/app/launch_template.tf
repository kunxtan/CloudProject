# "แม่พิมพ์" ของ EC2 ที่ Auto Scaling ใช้สร้างเครื่องใหม่ทุกครั้ง

resource "aws_launch_template" "app" {
  name                   = "${var.project}-app"
  image_id               = data.aws_ami.al2023.id
  instance_type          = var.instance_type
  vpc_security_group_ids = [local.base.app_security_group_id]
  update_default_version = true

  iam_instance_profile {
    arn = aws_iam_instance_profile.app.arn
  }

  metadata_options {
    http_tokens   = "required" # บังคับ IMDSv2 (กัน SSRF ขโมย credential)
    http_endpoint = "enabled"
    # ⚠️ ต้องเป็น 2: container ใน Docker อยู่ห่างจากเครื่องไป 1 hop
    # ถ้าเป็น 1 (ค่า default) backend ขอ credential ของ IAM Role ไม่ได้ → presign S3 พัง
    http_put_response_hop_limit = 2
  }

  # ตัด \r ทิ้ง: กันไฟล์ถูกแปลงเป็น CRLF บน Windows (bash บน Linux จะพัง)
  user_data = base64encode(replace(templatefile("${path.module}/user_data.sh.tftpl", {
    project        = var.project
    region         = var.region
    ssm_prefix     = local.base.ssm_prefix
    ecr_registry   = split("/", local.base.ecr_repository_url)[0]
    ecr_repo       = local.base.ecr_repository_url
    db_host        = local.base.db_host
    db_port        = local.base.db_port
    db_name        = local.base.db_name
    db_user        = local.base.db_username
    uploads_bucket = local.base.uploads_bucket
    log_group      = aws_cloudwatch_log_group.backend.name
  }), "\r", ""))

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name    = "${var.project}-app"
      Project = var.project
      Stack   = "app"
    }
  }

  tag_specifications {
    resource_type = "volume"
    tags = {
      Name    = "${var.project}-app"
      Project = var.project
      Stack   = "app"
    }
  }
}
