import { Check, ChevronDown, LayoutGrid } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link, matchPath, useLocation } from 'react-router';
import { cx } from './ui.jsx';

/**
 * เมนูหน้าแบบมือถือ: ปุ่มเดียวบอกหน้าปัจจุบัน → กดแล้วมีการ์ดให้เลือกหน้าที่จะไป
 * (จอ md ขึ้นไปใช้แถบเมนูปกติใน Layout)
 */
export function MobileNav({ items, className }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const itemRefs = useRef([]);
  const menuId = useId();
  const { pathname } = useLocation();

  const currentIndex = items.findIndex((it) => matchPath({ path: it.to, end: !!it.end }, pathname));
  const current = items[currentIndex];
  const CurrentIcon = current?.icon ?? LayoutGrid;

  // เปลี่ยนหน้า → ปิด
  useEffect(() => setOpen(false), [pathname]);

  // เปิดแล้ว: คลิกข้างนอก / Esc ปิด, โฟกัสหน้าปัจจุบัน (หรืออันแรก)
  useEffect(() => {
    if (!open) return undefined;
    (itemRefs.current[Math.max(currentIndex, 0)] ?? itemRefs.current[0])?.focus({ preventScroll: true });
    const onPointer = (e) => !rootRef.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, currentIndex]);

  // ลูกศรขึ้น/ลงเลื่อนระหว่างเมนู
  const onMenuKey = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const els = itemRefs.current.filter(Boolean);
    const i = els.indexOf(document.activeElement);
    const next = e.key === 'ArrowDown' ? (i + 1) % els.length : (i - 1 + els.length) % els.length;
    els[next]?.focus();
  };

  if (items.length < 2) return null;

  return (
    <div ref={rootRef} className={cx('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className={cx(
          'flex max-w-[11rem] items-center gap-1.5 rounded-full border-2 py-1.5 pr-2.5 pl-3 text-sm font-semibold transition-colors duration-100',
          open ? 'border-brand-300 bg-brand-100 text-brand-700' : 'border-brand-100 bg-brand-50 text-brand-700 hover:border-brand-200',
        )}
      >
        <CurrentIcon className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{current?.label ?? 'เมนู'}</span>
        <ChevronDown className={cx('size-4 shrink-0 transition-transform duration-200', open && 'rotate-180')} aria-hidden />
      </button>

      {open && (
        <nav
          id={menuId}
          aria-label="เมนูหลัก"
          onKeyDown={onMenuKey}
          className="animate-pop-in absolute top-full left-0 z-30 mt-2 w-60 max-w-[calc(100vw-2rem)] origin-top-left rounded-3xl border-2 border-cocoa-100 bg-white p-2 shadow-xl"
        >
          <ul role="menu" className="space-y-0.5">
            {items.map((it, i) => {
              const active = i === currentIndex;
              const Icon = it.icon;
              return (
                <li key={it.to} role="none">
                  <Link
                    ref={(el) => {
                      itemRefs.current[i] = el;
                    }}
                    to={it.to}
                    role="menuitem"
                    aria-current={active ? 'page' : undefined}
                    className={cx(
                      'flex items-center gap-3 rounded-2xl px-2.5 py-2 text-sm font-semibold transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-brand-400',
                      active ? 'bg-brand-50 text-brand-700' : 'text-cocoa-700 hover:bg-cocoa-50',
                    )}
                  >
                    <span
                      className={cx(
                        'flex size-9 shrink-0 items-center justify-center rounded-full',
                        active ? 'bg-brand-500 text-white' : 'bg-cocoa-100 text-cocoa-600',
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="flex-1">{it.label}</span>
                    {active && <Check className="size-4 text-brand-500" aria-hidden />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
