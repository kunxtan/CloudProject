# CloudFront = ประตูหน้าเดียวของทั้งระบบ (HTTPS)
#   /api/*      → ALB         (ไม่ cache, ส่ง header/query/cookie ผ่านทั้งหมด)
#   /uploads/*  → S3 uploads  (cache ได้)
#   /* (default)→ S3 frontend (cache ได้ + CloudFront Function ช่วยเรื่อง SPA)
# ทุกอย่างอยู่โดเมนเดียวกัน → frontend เรียก /api ได้ตรงๆ ไม่มีปัญหา CORS

locals {
  origin_frontend = "s3-frontend"
  origin_uploads  = "s3-uploads"
  origin_alb      = "alb"
}

# OAC: ให้ CloudFront อ่าน S3 ที่ปิด public ได้ (ลงลายเซ็นทุก request)
resource "aws_cloudfront_origin_access_control" "s3" {
  name                              = "${var.project}-s3-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# React Router: path อย่าง /my-queue ไม่มีไฟล์จริงใน S3 → เปลี่ยนเป็น /index.html ให้ React จัดการต่อ
resource "aws_cloudfront_function" "spa_rewrite" {
  name    = "${var.project}-spa-rewrite"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = <<-EOT
    function handler(event) {
      var request = event.request;
      var last = request.uri.split('/').pop();
      if (last.indexOf('.') === -1) {
        request.uri = '/index.html';
      }
      return request;
    }
  EOT
}

resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  comment             = var.project
  default_root_object = "index.html"
  price_class         = "PriceClass_200" # รวม edge ในเอเชีย (ไทย) แต่ไม่รวมอเมริกาใต้/โอเชียเนีย
  http_version        = "http2and3"

  # ---------- origins ----------

  origin {
    origin_id                = local.origin_frontend
    domain_name              = local.base.frontend_bucket_domain
    origin_access_control_id = aws_cloudfront_origin_access_control.s3.id
  }

  origin {
    origin_id                = local.origin_uploads
    domain_name              = local.base.uploads_bucket_domain
    origin_access_control_id = aws_cloudfront_origin_access_control.s3.id
  }

  origin {
    origin_id   = local.origin_alb
    domain_name = aws_lb.app.dns_name

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only" # ไม่มีโดเมนของตัวเอง → ALB ออก cert ไม่ได้ (ดู PLAN 3.2)
      origin_ssl_protocols   = ["TLSv1.2"]
    }

    custom_header {
      name  = "X-Origin-Verify"
      value = random_password.origin_verify.result
    }
  }

  # ---------- behaviors ----------

  default_cache_behavior {
    target_origin_id       = local.origin_frontend
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa_rewrite.arn
    }
  }

  ordered_cache_behavior {
    path_pattern             = "/api/*"
    target_origin_id         = local.origin_alb
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    compress                 = true
    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
  }

  ordered_cache_behavior {
    path_pattern           = "/uploads/*"
    target_origin_id       = local.origin_uploads
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true # ใช้ https://xxxx.cloudfront.net ได้ฟรี
  }
}

# ---------- bucket policies: อนุญาตเฉพาะ CloudFront distribution นี้อ่าน ----------

data "aws_iam_policy_document" "frontend_bucket" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${local.base.frontend_bucket_arn}/*"]
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.main.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = local.base.frontend_bucket
  policy = data.aws_iam_policy_document.frontend_bucket.json
}

data "aws_iam_policy_document" "uploads_bucket" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${local.base.uploads_bucket_arn}/uploads/*"]
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.main.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "uploads" {
  bucket = local.base.uploads_bucket
  policy = data.aws_iam_policy_document.uploads_bucket.json
}
