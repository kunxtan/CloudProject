variable "region" {
  type    = string
  default = "ap-southeast-1"
}

variable "project" {
  type    = string
  default = "hiwlaewq"
}

variable "instance_type" {
  type    = string
  default = "t3.micro"
}

variable "asg_min" {
  description = "จำนวนเครื่องขั้นต่ำ (2 = อยู่คนละ AZ → เครื่องหนึ่งพัง อีกเครื่องยังรับงานได้)"
  type        = number
  default     = 2
}

variable "asg_max" {
  type    = number
  default = 3
}

variable "asg_desired" {
  type    = number
  default = 2
}

variable "cpu_target_percent" {
  description = "Auto Scaling เพิ่ม/ลดเครื่องให้ CPU เฉลี่ยอยู่ราวๆ ค่านี้"
  type        = number
  default     = 60
}

variable "health_check_grace_seconds" {
  description = "เวลาที่ให้เครื่องใหม่บูต (ติดตั้ง Docker + pull image + migrate) ก่อนเริ่มนับ health check"
  type        = number
  default     = 300
}
