terraform {
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

  # state คนละไฟล์กับ base (key ต่างกัน) แต่อยู่ bucket เดียวกัน
  backend "s3" {
    bucket       = "hiwlaewq-tfstate-1177"
    key          = "app/terraform.tfstate"
    region       = "ap-southeast-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project   = var.project
      Stack     = "app"
      ManagedBy = "terraform"
    }
  }
}
