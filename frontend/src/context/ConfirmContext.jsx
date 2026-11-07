import { CircleHelp } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, cx } from '../components/ui.jsx';

/**
 * กล่องยืนยันของเว็บเอง (แทน window.confirm)
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: 'ลบโต๊ะ A1?', message: '...', confirmText: 'ลบโต๊ะ', tone: 'danger', icon: Trash2 }))) return;
 *
 * message ใช้ 
 ขึ้นบรรทัดใหม่ได้
 *
 * - คืน Promise<boolean>: กดยืนยัน = true, กดยกเลิก / Esc / คลิกพื้นหลัง = false
 * - tone 'danger' → ปุ่มแดง + โฟกัสเริ่มที่ "ยกเลิก" (กัน Enter พลาดแล้วลบทันที)
 */
const ConfirmContext = createContext(null);

const TONES = {
  danger: { bubble: 'bg-red-50 text-red-500 ring-red-100', button: 'dangerSolid' },
  primary: { bubble: 'bg-brand-100 text-brand-600 ring-brand-50', button: 'primary' },
};

const EASE_SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
const EASE_IN = 'cubic-bezier(0.55, 0, 1, 0.45)';
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null); // { id, options, resolve }
  const nextId = useRef(1);

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        setRequest((prev) => {
          prev?.resolve(false); // มีกล่องค้างอยู่ → ถือว่ายกเลิกอันเก่า
          return { id: nextId.current++, options, resolve };
        });
      }),
    [],
  );

  const finish = useCallback((result) => {
    setRequest((prev) => {
      prev?.resolve(result);
      return null;
    });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && <ConfirmDialog key={request.id} {...request.options} onDone={finish} />}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx;
}

function ConfirmDialog({
  title,
  message,
  confirmText = 'ยืนยัน',
  cancelText = 'ยกเลิก',
  tone = 'primary',
  icon: Icon = CircleHelp,
  onDone,
}) {
  const t = TONES[tone] ?? TONES.primary;
  const backdropRef = useRef(null);
  const cardRef = useRef(null);
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);
  const closingRef = useRef(false);
  const returnFocusRef = useRef(null);

  // เล่นแอนิเมชันปิดก่อน แล้วค่อยส่งผลลัพธ์กลับ
  const close = useCallback(
    async (result) => {
      if (closingRef.current) return;
      closingRef.current = true;
      const reduce = reducedMotion();
      await Promise.allSettled([
        cardRef.current?.animate(
          [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: reduce ? 'none' : 'translateY(6px) scale(0.95)' }],
          { duration: reduce ? 100 : 150, easing: EASE_IN, fill: 'forwards' },
        ).finished,
        backdropRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduce ? 100 : 200, easing: EASE_OUT, fill: 'forwards' })
          .finished,
      ]);
      onDone(result);
      returnFocusRef.current?.focus?.({ preventScroll: true });
    },
    [onDone],
  );

  // เปิด: แอนิเมชันเข้า + โฟกัสปุ่มเริ่มต้น (ก่อนวาดเฟรมแรก)
  useLayoutEffect(() => {
    returnFocusRef.current = document.activeElement;
    const reduce = reducedMotion();
    backdropRef.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduce ? 100 : 220, easing: EASE_OUT });
    cardRef.current.animate(
      [{ opacity: 0, transform: reduce ? 'none' : 'translateY(12px) scale(0.9)' }, { opacity: 1, transform: 'none' }],
      { duration: reduce ? 100 : 320, easing: reduce ? EASE_OUT : EASE_SPRING },
    );
    (tone === 'danger' ? cancelRef : confirmRef).current?.focus({ preventScroll: true });
  }, [tone]);

  // ระหว่างเปิด: ล็อกการเลื่อนหน้า, หยุดแอนิเมชันหน้าข้างหลัง (ดู index.css), ย้อมสีแถบ scrollbar ให้เข้ากับพื้นหลังเบลอ
  useEffect(() => {
    const html = document.documentElement;
    const prev = { overflow: html.style.overflow, bg: html.style.backgroundColor };
    html.style.overflow = 'hidden';
    html.style.backgroundColor = 'color-mix(in srgb, var(--color-cocoa-900) 25%, var(--color-cocoa-50))';
    html.dataset.overlayOpen = '';
    return () => {
      html.style.overflow = prev.overflow;
      html.style.backgroundColor = prev.bg;
      delete html.dataset.overlayOpen;
    };
  }, []);

  // Esc = ยกเลิก, Tab วนอยู่แค่ 2 ปุ่มในกล่อง
  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close(false);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      (document.activeElement === cancelRef.current ? confirmRef : cancelRef).current?.focus();
    }
  };

  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby={message ? 'confirm-message' : undefined}
      className="fixed inset-0 z-60 flex items-end justify-center p-4 sm:items-center"
      onKeyDown={onKeyDown}
    >
      <div ref={backdropRef} className="absolute inset-0 bg-cocoa-900/30 backdrop-blur-sm" onClick={() => close(false)} />

      <div
        ref={cardRef}
        className="relative w-full max-w-sm rounded-[2rem] border-2 border-white bg-white p-6 text-center shadow-2xl sm:p-7"
      >
        <span className={cx('mx-auto mb-4 flex size-16 items-center justify-center rounded-full ring-8', t.bubble)}>
          <Icon className="size-8" aria-hidden />
        </span>
        <h2 id="confirm-title" className="text-xl font-bold text-cocoa-900">
          {title}
        </h2>
        {message && (
          <p id="confirm-message" className="mt-2 text-sm whitespace-pre-line text-cocoa-500">
            {message}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row">
          <Button ref={cancelRef} variant="secondary" className="w-full sm:flex-1" onClick={() => close(false)}>
            {cancelText}
          </Button>
          <Button ref={confirmRef} variant={t.button} className="w-full sm:flex-1" onClick={() => close(true)}>
            {confirmText}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
