import { useState } from 'react';
import { cx } from './ui.jsx';

// สีพื้นหลังตอนยังไม่มีรูป — โทนชานม/ขนมหวาน เลือกตาม id ให้แต่ละคนได้สีเดิมเสมอ
const SWATCHES = [
  'bg-brand-200 text-brand-800',
  'bg-cocoa-200 text-cocoa-800',
  'bg-amber-100 text-brand-700',
  'bg-rose-100 text-rose-800',
  'bg-emerald-100 text-emerald-800',
];

/**
 * ตัวอักษรย่อจากชื่อ — ข้ามสระหน้า (เ แ โ ใ ไ) และวรรณยุกต์ เอาพยัญชนะไทยตัวแรกหรือตัวอักษร/ตัวเลขอังกฤษ
 * "เจ้าของร้าน" → "จ", "ใบเตย" → "บ", "alice" → "A"
 */
export function initialOf(name) {
  const ch = (name ?? '').match(/[ก-ฮ]|[A-Za-z0-9]/)?.[0];
  return ch ? ch.toUpperCase() : '?';
}

/** รูปโปรไฟล์วงกลม — ไม่มีรูป (หรือโหลดรูปไม่ได้) จะแสดงตัวอักษรแรกของชื่อแทน */
export function Avatar({ user, className }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const url = user?.avatarUrl;

  if (url && failedUrl !== url) {
    return (
      <img
        src={url}
        alt=""
        onError={() => setFailedUrl(url)}
        className={cx('shrink-0 rounded-full bg-cocoa-100 object-cover', className)}
      />
    );
  }
  const initial = initialOf(user?.name);
  return (
    <span
      aria-hidden
      className={cx(
        'flex shrink-0 items-center justify-center rounded-full font-bold select-none',
        SWATCHES[(user?.id ?? 0) % SWATCHES.length],
        className,
      )}
    >
      {initial}
    </span>
  );
}
