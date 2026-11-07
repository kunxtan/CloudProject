-- ฐานข้อมูลแยกสำหรับ integration test (ถูกล้างทุกครั้งที่รันเทสต์)
CREATE DATABASE IF NOT EXISTS hiwlaewq_test;
GRANT ALL PRIVILEGES ON hiwlaewq_test.* TO 'hiwlaewq'@'%';
FLUSH PRIVILEGES;
