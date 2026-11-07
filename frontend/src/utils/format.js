const timeFmt = new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' });
const dateFmt = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', timeZone: 'Asia/Bangkok' });
const dateTimeFmt = new Intl.DateTimeFormat('th-TH', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Bangkok',
});

export const formatTime = (iso) => (iso ? timeFmt.format(new Date(iso)) : '-');
export const formatDateTime = (iso) => (iso ? dateTimeFmt.format(new Date(iso)) : '-');
const longDateFmt = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' });
/** "7 พ.ย. 2569" */
export const formatLongDate = (iso) => (iso ? longDateFmt.format(new Date(iso)) : '-');
/** "2026-11-07" → "7 พ.ย." */
export const formatShortDate = (ymd) => dateFmt.format(new Date(`${ymd}T12:00:00+07:00`));

export function minutesSince(iso, now = Date.now()) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
}

/** 45 → "45 นาที", 551 → "9 ชม. 11 นาที", 120 → "2 ชม." */
export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} นาที`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} ชม. ${m} นาที` : `${h} ชม.`;
}

/** "5 นาทีที่แล้ว" / "9 ชม. 11 นาทีที่แล้ว" / "เมื่อสักครู่" */
export const formatAgo = (minutes) => (minutes < 1 ? 'เมื่อสักครู่' : `${formatDuration(minutes)}ที่แล้ว`);

/** แยกเป็นตัวเลข + หน่วย เพื่อแสดงตัวเลขใหญ่ หน่วยเล็ก: 125 → [[2,'ชม.'],[5,'นาที']] */
export function durationParts(minutes) {
  if (minutes < 60) return [[minutes, 'นาที']];
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? [[h, 'ชม.'], [m, 'นาที']] : [[h, 'ชม.']];
}

export function formatWait(minutes) {
  if (minutes <= 0) return 'ไม่ต้องรอ';
  if (minutes < 60) return `ราว ${minutes} นาที`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `ราว ${h} ชม. ${m} นาที` : `ราว ${h} ชม.`;
}

/** วันที่ตามเวลาไทย YYYY-MM-DD */
export function todayBangkok(offsetDays = 0) {
  const d = new Date(Date.now() + 7 * 3600_000 + offsetDays * 86_400_000);
  return d.toISOString().slice(0, 10);
}
