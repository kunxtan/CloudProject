# hiwlaewQ — Runbook

คู่มือการดูแลระบบบน AWS: เปิด/ปิด, deploy, rollback, รับมือเมื่อมีปัญหา และผลการทดสอบความทนทาน

- Region: `ap-southeast-1` (Singapore)
- คำสั่งทั้งหมดใช้ได้ทั้ง PowerShell และ bash (ถ้ารันใน **Git Bash** ให้ตั้ง `MSYS_NO_PATHCONV=1` ก่อน ไม่งั้น path แบบ `/hiwlaewq/...` จะถูกแปลงเป็น path ของ Windows)

---

## 1. ภาพรวมที่ต้องรู้

| สิ่งของ | ชื่อ / ที่อยู่ |
|---|---|
| เว็บ | `terraform output cloudfront_url` (ใน `infra/app`) |
| Auto Scaling Group | `hiwlaewq-asg` (min 2 / max 3, กระจาย 2 AZ) |
| Target group | `hiwlaewq-tg` — health check `GET /api/health` ทุก 10 วิ, ไม่ผ่าน 2 ครั้ง = unhealthy |
| Database | RDS `hiwlaewq-db` (MySQL 8, private subnet) |
| Docker image | ECR `hiwlaewq-backend` — tag = git SHA |
| เวอร์ชันที่รันอยู่ | SSM `/hiwlaewq/image_tag` |
| Log | CloudWatch Logs `/hiwlaewq/backend` (1 stream ต่อ 1 เครื่อง, ชื่อ stream = instance id) |
| Dashboard | CloudWatch → Dashboards → `hiwlaewq` |
| แจ้งเตือน | SNS `hiwlaewq-alerts` → อีเมลทีม |

Health check มี 2 แบบ:

- `GET /api/health` — **liveness** ไม่แตะ DB, ALB ใช้ตัวนี้ (เหตุผลดู [ADR-0005](decisions/0005-liveness-health-check.md))
- `GET /api/health/ready` — **readiness** เช็คว่าต่อ DB ได้, ใช้ตอน debug

Infra แบ่ง 2 stack:

- `infra/base` — VPC, Security Group, RDS, S3, ECR, SSM, SNS, OIDC role · สร้างครั้งเดียว อยู่ถาวร
- `infra/app` — ALB, ASG, CloudFront, IAM ของ EC2, dashboard, alarms · **apply / destroy ได้ตลอด** (ส่วนที่กินเครดิตหลัก)

---

## 2. เปิด / ปิดระบบ

### เปิด

```
aws rds start-db-instance --db-instance-identifier hiwlaewq-db
aws rds wait db-instance-available --db-instance-identifier hiwlaewq-db

cd infra/app
terraform apply
terraform output cloudfront_url
```

- เครื่อง EC2 ใช้เวลาบูตประมาณ 2–3 นาที (ติดตั้ง Docker → pull image → migrate DB → start)
- CloudFront ที่สร้างใหม่ใช้เวลา ~5 นาทีกว่าจะใช้งานได้ทุก edge
- เช็คว่าพร้อม: Target group `hiwlaewq-tg` ต้องมี **2 healthy**

### ปิด

```
cd infra/app
terraform destroy

aws rds stop-db-instance --db-instance-identifier hiwlaewq-db
```

- RDS ที่ stop ไว้ AWS จะ **เปิดให้เองอัตโนมัติหลัง 7 วัน** — ถ้ายังไม่ใช้ต้อง stop ซ้ำ
- `terraform destroy` ลบ dashboard และ alarms ด้วย (metric ย้อนหลังยังอยู่ใน CloudWatch ~15 วัน)
- stack `base/` ไม่ต้องลบ ค่าใช้จ่ายแทบเป็น 0 (ยกเว้น RDS ตอนเปิด)

---

## 3. Deploy

### ปกติ (อัตโนมัติ)

push เข้า `main` (ที่ไม่ได้แก้แค่ `infra/**`, `loadtest/**` หรือ `*.md`) → GitHub Actions `Deploy`:

1. CI (test) ต้องผ่าน
2. build image → push ECR ด้วย tag = git SHA
3. เขียน SHA ลง SSM `/hiwlaewq/image_tag`
4. **Instance refresh** (`MinHealthyPercentage=50`, warmup 120 วิ) — เปลี่ยนเครื่องทีละตัว:
   ASG ถอดเครื่องเก่าออกจาก ALB → รอ request ที่ค้าง 30 วิ (`deregistration_delay`) → container ได้ SIGTERM → graceful shutdown → เครื่องใหม่บูต → ผ่าน health check → ทำตัวถัดไป
5. build frontend → sync ขึ้น S3 (`assets/` ก่อน แล้วค่อย `index.html`)

### Deploy เอง

GitHub → Actions → **Deploy** → **Run workflow** (branch `main`)

### ถ้า stack app ปิดอยู่ตอน deploy

workflow จะอัปเดต image tag ใน SSM แล้วข้าม instance refresh — เวอร์ชันใหม่จะถูกใช้ตอน `terraform apply` ครั้งถัดไป

### ข้อควรระวังเรื่อง migration

ระหว่าง rolling deploy เครื่องเก่ากับใหม่รันพร้อมกันกับ DB ตัวเดียว → migration ต้อง **backward compatible** (เพิ่มคอลัมน์ได้ ห้ามลบ/เปลี่ยนชื่อคอลัมน์ที่โค้ดเก่ายังใช้ในรอบเดียวกัน ให้แยกเป็น 2 deploy)

---

## 4. Rollback

ใช้เมื่อ deploy แล้วเวอร์ชันใหม่มีบั๊ก

**1. หา tag ของเวอร์ชันก่อนหน้า** (git SHA ที่เคย deploy สำเร็จ)

```
aws ecr describe-images --repository-name hiwlaewq-backend --query "sort_by(imageDetails,&imagePushedAt)[-5:].[imageTags[0],imagePushedAt]" --output table
```

**2. ชี้กลับไปเวอร์ชันเดิม แล้วเปลี่ยนเครื่องแบบ rolling**

```
aws ssm put-parameter --name /hiwlaewq/image_tag --value <SHA-เดิม> --overwrite
aws autoscaling start-instance-refresh --auto-scaling-group-name hiwlaewq-asg --preferences MinHealthyPercentage=50,InstanceWarmup=120
```

**3. ติดตาม**

```
aws autoscaling describe-instance-refreshes --auto-scaling-group-name hiwlaewq-asg --max-records 1 --query "InstanceRefreshes[0].[Status,PercentageComplete]"
```

ใช้เวลา ~6 นาที ไม่มี downtime

**4. แก้ใน git ด้วย** — `git revert <commit ที่มีบั๊ก>` แล้ว push ไม่งั้น deploy ครั้งถัดไปจะ build โค้ดที่มีบั๊กขึ้นไปอีก

> Frontend rollback: checkout commit เดิมแล้วกด Run workflow (หรือ revert แล้ว push) — workflow build และ sync ใหม่ให้

---

## 5. เมื่อมีปัญหา

### 5.1 ได้อีเมลแจ้งเตือน

| Alarm | เงื่อนไข | ดูอะไรก่อน |
|---|---|---|
| `hiwlaewq-healthy-hosts-low` | เครื่อง healthy < 2 ติดกัน 5 นาที | 5.2 |
| `hiwlaewq-5xx-high` | backend ตอบ 5xx > 10 ครั้งใน 5 นาที | 5.4 (log) |
| `hiwlaewq-rds-cpu-high` | RDS CPU เฉลี่ย > 80% นาน 10 นาที | 5.5 |
| `hiwlaewq-rds-storage-low` | พื้นที่ DB เหลือ < 2 GB | เพิ่ม `allocated_storage` ใน `infra/base/rds.tf` |

alarm healthy hosts ตั้งไว้ 5 นาทีเพราะเครื่องใหม่ใช้ ~2–4 นาทีกว่าจะ healthy — เครื่องดับแล้วระบบซ่อมเองทันจะไม่มีอีเมล

### 5.2 เครื่อง EC2 พัง / หายไป

**ปกติไม่ต้องทำอะไร** — ระบบจัดการเอง:

1. ALB health check ไม่ผ่าน 2 ครั้ง (~10–20 วิ) → หยุดส่ง request ให้เครื่องนั้น
2. ASG เห็นว่าเครื่อง unhealthy/หายไป → ลบทิ้งและสร้างเครื่องใหม่
3. เครื่องใหม่ healthy ภายใน ~2–4 นาที

ตรวจสอบ: EC2 → Auto Scaling Groups → `hiwlaewq-asg` → แท็บ **Activity**

ถ้าเครื่องใหม่ **วนเกิดแล้วตาย** (Activity มี Launch/Terminate ซ้ำๆ) → เครื่องบูตไม่ขึ้น ดู 5.3

### 5.3 เครื่องใหม่บูตไม่ขึ้น / ไม่ผ่าน health check

เข้าเครื่องผ่าน **SSM Session Manager** (ไม่มี SSH): EC2 → เลือกเครื่อง → **Connect** → Session Manager

```
sudo tail -50 /var/log/cloud-init-output.log   # user_data: ติดตั้ง Docker / ดึงค่า SSM / pull image
sudo docker ps -a                               # container รันอยู่ไหม
sudo docker logs hiwlaewq --tail 100            # error ตอน migrate / start
curl -s localhost:3000/api/health               # app ตอบไหม
curl -s localhost:3000/api/health/ready         # ต่อ DB ได้ไหม
```

สาเหตุที่เจอบ่อย:

| อาการ | สาเหตุ |
|---|---|
| `docker pull` ไม่เจอ tag | `/hiwlaewq/image_tag` ชี้ไปที่ tag ที่ไม่มีใน ECR |
| migrate ค้าง / error ต่อ DB | RDS ถูก stop อยู่ หรือยังบูตไม่เสร็จ |
| container restart วน | ดู `docker logs` — มักเป็น env ผิดหรือ migration พัง |

### 5.4 เว็บตอบ error 5xx

ดู log: CloudWatch → **Logs Insights** → เลือก `/hiwlaewq/backend`

```
fields @timestamp, @logStream, @message
| filter level >= 50
| sort @timestamp desc
| limit 50
```

(log เป็น JSON ของ pino: `level` 50 = error, 40 = warn · มี `userId` และ `responseTime`)

แยกที่มาของ 5xx จาก dashboard:

- **Target 5XX** — app ตอบ error เอง → ดู log
- **ELB 502/504** โดยที่ Target 5XX = 0 — ALB ต่อเครื่องไม่ได้ (เครื่องกำลังดับ/ค้าง) → ดู 5.2

### 5.5 DB หนัก / DB ล่ม

- RDS CPU สูง: ดู query ที่ช้าใน RDS → Performance Insights (ถ้าเปิด) หรือ slow query log · endpoint ที่ถูกเรียกบ่อยสุดคือ `GET /api/queues/me` และ `GET /api/notifications` (poll ทุก 5 วิ)
- DB ล่ม (single-AZ): **ระบบใช้งานไม่ได้** แต่เครื่อง EC2 จะไม่ถูกลบทิ้ง (health check ไม่เช็ค DB) — เมื่อ DB กลับมาก็ใช้งานต่อได้ทันที
- กู้ข้อมูล: RDS → Automated backups → **Restore to point in time** (ได้เป็น DB ตัวใหม่ ต้องเปลี่ยน endpoint ใน Terraform) · backup เก็บ `rds_backup_retention_days` วัน (ค่าเริ่มต้น 1 วันตามข้อจำกัดของบัญชี Free plan)
- เปิด Multi-AZ (failover อัตโนมัติ ~1–2 นาที): ตั้ง `rds_multi_az = true` ใน `infra/base` แล้ว `terraform apply` — ค่าใช้จ่าย RDS ×2

---

## 6. ผลการทดสอบ

เครื่องมือ: [k6](https://k6.io/) สคริปต์ [`loadtest/polling.js`](../loadtest/polling.js) — จำลองลูกค้าเปิดหน้า "คิวของฉัน" ค้างไว้ ทุก 5 วิยิง `GET /api/queues/me` + `GET /api/notifications?unread=true` (เหมือน frontend จริง) ยิงจากเครื่องในไทย → CloudFront → ALB

ตัวเลขทั้งหมดดึงจาก CloudWatch (ALB metrics)

### 6.1 Load test — 500 ผู้ใช้พร้อมกัน (11 พ.ย. 2026, 02:42–02:48)

```
k6 run -e BASE_URL=<cloudfront_url> loadtest/polling.js
```

| ตัวชี้วัด | ผล | เกณฑ์ |
|---|---|---|
| Throughput | ~11,900 req/นาที (≈ 200 req/s) | — |
| Error (4xx/5xx) | **0%** | < 1% ✅ |
| p95 response time ที่ server (ALB `TargetResponseTime`) | **6–9 ms** | < 300 ms ✅ |
| EC2 CPU (สูงสุด) | ~13% | — |
| RDS CPU (สูงสุด) | ~12% | — |
| RDS connections (สูงสุด) | 20 | — |

สรุป: 2 เครื่อง t3.micro + db.t3.micro รับ 500 ผู้ใช้ที่ poll ทุก 5 วิได้สบาย ยังเหลือ headroom มาก — ASG ไม่ต้อง scale out

### 6.2 Failover — ปิดเครื่อง 1 ใน 2 ระหว่างมีผู้ใช้ 500 คน (12 พ.ย. 2026, ~17:27)

วิธี: รัน k6 (`HOLD=10m`) → EC2 Console → Terminate เครื่องใน ASG 1 ตัว

| เวลา | เหตุการณ์ |
|---|---|
| ~17:27 | terminate `i-00bb…` (AZ a) |
| ~17:27 (+13 วิ) | ALB เลิกส่ง request ให้เครื่องนั้น — เครื่องที่เหลือรับ 500 ผู้ใช้คนเดียว p95 < 10 ms |
| 17:29:05 | ASG สร้างเครื่องทดแทนอัตโนมัติ |
| 17:31:17 | เครื่องใหม่ healthy — กลับมาครบ 2 เครื่อง |

| ตัวชี้วัด | ผล |
|---|---|
| Request ทั้งรอบ | 122,678 |
| Error | 1,352 (**1.1%**) — ELB 502 = 703, ELB 504 = 649, **app 5xx = 0** |
| ช่วงที่มี error | ~13 วิ หลัง terminate เท่านั้น นอกนั้น 0 |
| เวลากู้คืนจนครบ 2 เครื่อง | **~4 นาที** โดยไม่มีคนทำอะไร |

**ทำไมมี error:** เครื่องดับแบบไม่ได้แจ้ง ALB ก่อน → ALB ยังส่ง request ไปจนกว่า health check จะไม่ผ่าน 2 ครั้ง ช่วงนั้น request ครึ่งหนึ่ง (≈ 100 req/s × 13 วิ ≈ 1,300) ไปตกที่เครื่องที่ดับ

**ผลต่อผู้ใช้จริง:** หน้าเว็บ poll ใหม่ทุก 5 วิ → request ที่พังทำให้ข้อมูลอัปเดตช้าไป 1–2 รอบ ไม่ใช่เว็บล่ม

**ถ้าต้องการลด:** ลด health check interval เป็น 5 วิ (error window สั้นลงครึ่งหนึ่ง แลกกับ health check request ที่มากขึ้น) หรือเพิ่ม retry 1 ครั้งฝั่ง frontend

### 6.3 Zero-downtime deploy — deploy ระหว่างมีผู้ใช้ 500 คน (12 พ.ย. 2026, 17:41–17:47)

วิธี: รัน k6 (`HOLD=20m`) → GitHub Actions → Deploy → Run workflow

| ตัวชี้วัด | ผล |
|---|---|
| Request ทั้งรอบ | 247,367 |
| Error (4xx/5xx) | **0** ✅ |
| Instance refresh | 17:41:32 → 17:47:17 (**~5 นาที 45 วิ**) เปลี่ยนครบ 2 เครื่องทีละตัว |
| p95 response time ระหว่าง deploy | 7–21 ms |
| เครื่อง healthy ต่ำสุดระหว่าง deploy | 1 (ไม่เคยเป็น 0) |

**ต่างจาก 6.2 ยังไง:** ตอน deploy ASG ถอดเครื่องออกจาก ALB **ก่อน** แล้วรอ request ที่ค้างอยู่ 30 วิ จากนั้น container ได้ SIGTERM และปิดตัวแบบ graceful → ไม่มี request ไหนไปตกที่เครื่องที่กำลังดับ

### 6.4 Concurrency — เลขคิวไม่ซ้ำ

integration test ใน [`backend/tests/integration/queue.test.js`](../backend/tests/integration/queue.test.js) — รันใน CI (MySQL 8.4 จริง) ทุกครั้งก่อน deploy

- ลูกค้า 40 คนกดจองร้านเดียวกันพร้อมกัน → ได้เลขคิว 1–40 ครบ ไม่ซ้ำ ไม่ข้าม (atomic upsert ที่ `queue_counters` + `UNIQUE` constraint)
- ลูกค้าคนเดียวกดจองรัว 5 ครั้งพร้อมกัน → สำเร็จ 1 ครั้ง อีก 4 ครั้งได้ 409
