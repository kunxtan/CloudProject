# ให้ GitHub Actions deploy ขึ้น AWS ได้ "โดยไม่มี access key"
#
# OIDC: ตอน workflow รัน GitHub จะออก token ยืนยันว่า "ฉันคือ repo X branch Y"
# AWS ตรวจ token แล้วออก credential ชั่วคราว (หมดอายุใน 1 ชม.) ให้ assume role ด้านล่าง
# → ไม่มี secret ให้หลุด, จำกัดได้ว่าเฉพาะ branch main ของ repo นี้เท่านั้น

variable "github_repo" {
  description = "owner/repo บน GitHub ที่อนุญาตให้ deploy"
  type        = string
  default     = "kunxtan/CloudProject"
}

resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

data "aws_iam_policy_document" "github_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # เฉพาะ push เข้า main ของ repo นี้ (PR / branch อื่น / repo อื่น assume ไม่ได้)
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repo}:ref:refs/heads/main"]
    }
  }
}

resource "aws_iam_role" "github_deploy" {
  name                 = "${var.project}-github-deploy"
  assume_role_policy   = data.aws_iam_policy_document.github_assume.json
  max_session_duration = 3600
}

data "aws_iam_policy_document" "github_deploy" {
  # push image เข้า ECR
  statement {
    sid       = "EcrAuth"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }
  statement {
    sid = "EcrPush"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
      "ecr:PutImage",
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
    ]
    resources = [aws_ecr_repository.backend.arn]
  }

  # เปลี่ยน image tag ที่ EC2 จะใช้
  statement {
    sid       = "ImageTag"
    actions   = ["ssm:GetParameter", "ssm:PutParameter"]
    resources = [aws_ssm_parameter.image_tag.arn]
  }

  # สั่ง rolling deploy (instance refresh)
  statement {
    sid       = "AsgDescribe"
    actions   = ["autoscaling:DescribeAutoScalingGroups", "autoscaling:DescribeInstanceRefreshes"]
    resources = ["*"] # Describe* ระบุ resource ไม่ได้
  }
  statement {
    sid       = "AsgRefresh"
    actions   = ["autoscaling:StartInstanceRefresh"]
    resources = ["arn:aws:autoscaling:${var.region}:${local.account_id}:autoScalingGroup:*:autoScalingGroupName/${var.project}-asg"]
  }

  # อัปโหลด frontend
  statement {
    sid       = "FrontendList"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.frontend.arn]
  }
  statement {
    sid       = "FrontendWrite"
    actions   = ["s3:PutObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.frontend.arn}/*"]
  }
}

resource "aws_iam_role_policy" "github_deploy" {
  name   = "${var.project}-github-deploy"
  role   = aws_iam_role.github_deploy.id
  policy = data.aws_iam_policy_document.github_deploy.json
}

output "github_deploy_role_arn" {
  value = aws_iam_role.github_deploy.arn
}
