# ที่เก็บ Docker image ของ backend (private registry)

resource "aws_ecr_repository" "backend" {
  name                 = "${var.project}-backend"
  image_tag_mutability = "MUTABLE" # ให้ push tag เดิม (เช่น v1) ซ้ำได้ตอนทดลอง; CI จะใช้ git SHA เป็น tag
  force_delete         = true      # image สร้างใหม่จากโค้ดได้เสมอ → ลบ repo ได้แม้มี image อยู่

  image_scanning_configuration {
    scan_on_push = true # สแกนช่องโหว่แบบ basic (ฟรี)
  }
}

# เก็บแค่ 10 image ล่าสุด กันค่า storage บวม
resource "aws_ecr_lifecycle_policy" "backend" {
  repository = aws_ecr_repository.backend.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}
