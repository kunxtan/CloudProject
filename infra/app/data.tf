# อ่านค่าที่ stack base สร้างไว้ (VPC, subnet, SG, RDS, S3, ECR, SSM) จาก state ของ base โดยตรง

data "terraform_remote_state" "base" {
  backend = "s3"
  config = {
    bucket = "hiwlaewq-tfstate-1177"
    key    = "base/terraform.tfstate"
    region = "ap-southeast-1"
  }
}

locals {
  base = data.terraform_remote_state.base.outputs
}

# Amazon Linux 2023 (x86_64) ตัวล่าสุด
data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }
}

# managed policies ของ CloudFront (AWS เตรียมไว้ให้แล้ว)
data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_viewer_except_host" {
  name = "Managed-AllViewerExceptHostHeader"
}
