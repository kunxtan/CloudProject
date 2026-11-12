import { Bell, BellRing, Clock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { formatTime } from '../utils/format.js';

export function NotificationBell({ notifications, unreadCount, onRead, onReadAll }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const count = unreadCount; // ตัวเลขบนกระดิ่ง = เฉพาะที่ยังไม่อ่าน
  const total = notifications.length; // รายการทั้งหมดในกล่อง (รวมที่อ่านแล้ว)

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    // มือถือ: ไม่ใส่ relative → กล่องไปยึดกับ header (sticky) ทั้งแถบ กว้างเต็มจอเว้นขอบ 16px / จอ sm ขึ้นไป: ยึดใต้ปุ่มกระดิ่ง
    <div className="sm:relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2.5 text-cocoa-600 hover:bg-brand-50"
        aria-label={count ? `การแจ้งเตือน ${count} รายการที่ยังไม่อ่าน` : 'การแจ้งเตือน'}
        aria-expanded={open}
      >
        <Bell className="size-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-brand-500 text-[11px] font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-pop-in absolute z-30 mt-2 overflow-hidden rounded-3xl border-2 border-cocoa-100 bg-white shadow-xl max-sm:inset-x-4 max-sm:top-full sm:right-0 sm:w-80">
          <div className="flex items-center justify-between border-b border-cocoa-100 px-4 py-3">
            <p className="font-semibold">การแจ้งเตือน</p>
            {count > 0 && (
              <button onClick={onReadAll} className="text-xs font-medium text-brand-600 hover:underline">
                อ่านทั้งหมด
              </button>
            )}
          </div>
          {total === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-cocoa-500">ไม่มีการแจ้งเตือนใหม่</p>
          ) : (
            <ul className="max-h-80 divide-y divide-cocoa-100 overflow-y-auto">
              {notifications.map((n) => (
  <li key={n.id}>
    <button
      onClick={() => !n.isRead && onRead(n.id)}
      className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-cocoa-50 ${n.isRead ? 'opacity-60' : ''}`}
    >
      {n.type === 'ready' ? (
        <BellRing className={`mt-0.5 size-5 shrink-0 ${n.isRead ? 'text-cocoa-400' : 'text-brand-500'}`} aria-hidden />
      ) : (
        <Clock className={`mt-0.5 size-5 shrink-0 ${n.isRead ? 'text-cocoa-400' : 'text-brand-400'}`} aria-hidden />
      )}
      <span className="flex-1">
        <span className={`block text-sm ${n.isRead ? 'text-cocoa-500' : 'font-medium text-cocoa-800'}`}>{n.message}</span>
        <span className="mt-0.5 block text-xs text-cocoa-500">{formatTime(n.createdAt)}</span>
      </span>
      {!n.isRead && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-500" aria-label="ยังไม่อ่าน" />}
    </button>
  </li>
))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
