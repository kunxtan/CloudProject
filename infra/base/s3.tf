# bucket 2 อัน (ทั้งคู่ปิด public 100%):
#   frontend → ไฟล์ React ที่ build แล้ว  (CloudFront อ่านผ่าน OAC — bucket policy อยู่ใน stack app)
#   uploads  → รูปที่ผู้ใช้อัปโหลด         (browser เขียนผ่าน presigned POST, CloudFront อ่านผ่าน OAC)
# ชื่อ bucket ต้องไม่ซ้ำทั้งโลก → ต่อท้ายด้วย account ID

locals {
  frontend_bucket = "${var.project}-frontend-${local.account_id}"
  uploads_bucket  = "${var.project}-uploads-${local.account_id}"
}

# ---------- frontend ----------

resource "aws_s3_bucket" "frontend" {
  bucket        = local.frontend_bucket
  force_destroy = true # เป็นแค่ไฟล์ build สร้างใหม่ได้เสมอ → ลบ bucket ได้แม้มีไฟล์อยู่
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ---------- uploads ----------

resource "aws_s3_bucket" "uploads" {
  bucket        = local.uploads_bucket
  force_destroy = false # รูปของผู้ใช้ — กันลบทิ้งพร้อมไฟล์โดยไม่ตั้งใจ
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# browser POST ไฟล์ตรงเข้า S3 (ข้ามโดเมน) → ต้องเปิด CORS ให้ POST
resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  cors_rule {
    allowed_methods = ["POST"]
    allowed_origins = var.upload_cors_origins
    allowed_headers = ["*"]
    max_age_seconds = 3000
  }
}
