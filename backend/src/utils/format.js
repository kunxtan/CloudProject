/** 7 → "007" (เลขคิวที่แสดงให้ลูกค้าเห็น) */
export function formatQueueNumber(n) {
  return String(n).padStart(3, '0');
}

/** แปลง Date จาก DB เป็น ISO string (หรือ null) */
export function iso(value) {
  return value ? new Date(value).toISOString() : null;
}
