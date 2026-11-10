# IAM Role ของ EC2 — ให้สิทธิ์ "เท่าที่จำเป็น" (least privilege)
# credential ของ role นี้ AWS หมุนให้อัตโนมัติ → ไม่มี access key อยู่บนเครื่องเลย

data "aws_iam_policy_document" "ec2_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "app" {
  name               = "${var.project}-ec2-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

data "aws_iam_policy_document" "app" {
  # pull image จาก ECR
  statement {
    sid       = "EcrAuth"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"] # action นี้ระบุ resource ไม่ได้
  }
  statement {
    sid = "EcrPull"
    actions = [
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchCheckLayerAvailability",
    ]
    resources = [local.base.ecr_repository_arn]
  }

  # อ่าน secrets ตอนบูต (SecureString ใช้ key aws/ssm → ไม่ต้องให้ kms:Decrypt เพิ่ม)
  statement {
    sid       = "ReadSecrets"
    actions   = ["ssm:GetParameter"]
    resources = local.base.ssm_parameter_arns
  }

  # backend ออก presigned POST → ไฟล์ที่ browser อัปโหลดจะถูกเขียนด้วยสิทธิ์ของ role นี้
  statement {
    sid       = "WriteUploads"
    actions   = ["s3:PutObject"]
    resources = ["${local.base.uploads_bucket_arn}/uploads/*"]
  }

  # Docker awslogs driver ส่ง log เข้า CloudWatch
  statement {
    sid       = "WriteLogs"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.backend.arn}:*"]
  }
}

resource "aws_iam_role_policy" "app" {
  name   = "${var.project}-ec2-policy"
  role   = aws_iam_role.app.id
  policy = data.aws_iam_policy_document.app.json
}

# เข้าเครื่องผ่าน SSM Session Manager แทน SSH (ไม่ต้องเปิด port 22 / ไม่ต้องมี key pair)
resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.app.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "app" {
  name = "${var.project}-ec2-profile"
  role = aws_iam_role.app.name
}
