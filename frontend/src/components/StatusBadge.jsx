import { BellRing, Check, Clock, SkipForward, X } from 'lucide-react';

// สถานะมาพร้อมไอคอน + ข้อความเสมอ (ไม่สื่อด้วยสีอย่างเดียว)
const STATUS = {
  waiting: { label: 'รอคิว', icon: Clock, className: 'bg-sky-50 text-sky-800 ring-sky-200' },
  called: { label: 'เรียกแล้ว', icon: BellRing, className: 'bg-brand-50 text-brand-700 ring-brand-200' },
  seated: { label: 'ได้โต๊ะแล้ว', icon: Check, className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  skipped: { label: 'ข้ามคิว', icon: SkipForward, className: 'bg-cocoa-100 text-cocoa-600 ring-cocoa-200' },
  cancelled: { label: 'ยกเลิก', icon: X, className: 'bg-cocoa-100 text-cocoa-600 ring-cocoa-200' },
};

export function StatusBadge({ status }) {
  const s = STATUS[status] ?? STATUS.waiting;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full whitespace-nowrap px-2.5 py-0.5 text-xs font-medium ring-1 ${s.className}`}>
      <Icon className="size-3.5" aria-hidden />
      {s.label}
    </span>
  );
}

export function OpenBadge({ isOpen }) {
  return isOpen ? (
    <span className="inline-flex items-center gap-1.5 rounded-full whitespace-nowrap bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
      <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
      เปิดรับคิว
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full whitespace-nowrap bg-cocoa-100 px-2.5 py-0.5 text-xs font-medium text-cocoa-600 ring-1 ring-cocoa-200">
      <span className="size-1.5 rounded-full bg-cocoa-400" aria-hidden />
      ปิดรับคิว
    </span>
  );
}
