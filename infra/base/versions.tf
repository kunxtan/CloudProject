terraform {
  # use_lockfile (S3 native locking) ต้องใช้ Terraform 1.10 ขึ้นไป
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # state ของ stack นี้เก็บใน S3 bucket ที่สร้างด้วยมือในขั้นที่ 0
  # use_lockfile = กันไม่ให้ 2 คน apply พร้อมกัน (ไม่ต้องใช้ DynamoDB)
  backend "s3" {
    bucket       = "hiwlaewq-tfstate-1177"
    key          = "base/terraform.tfstate"
    region       = "ap-southeast-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = var.region

  # ติด tag นี้ให้ทุก resource อัตโนมัติ → ไปกรองดูค่าใช้จ่ายใน Cost Explorer ได้
  default_tags {
    tags = {
      Project   = var.project
      Stack     = "base"
      ManagedBy = "terraform"
    }
  }
}

data "aws_caller_identity" "current" {}

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  account_id = data.aws_caller_identity.current.account_id
  azs        = slice(data.aws_availability_zones.available.names, 0, 2)
}
