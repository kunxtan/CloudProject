import { LogOut, UserRound } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router';
import { Avatar } from './Avatar.jsx';

const ROLE_LABEL = { customer: 'ลูกค้า', staff: 'พนักงาน', owner: 'เจ้าของร้าน' };

/* ───────────── animation helpers ───────────── */

const supportsLinearEasing =
  typeof CSS !== 'undefined' && CSS.supports?.('animation-timing-function', 'linear(0, 1)');

/**
 * จำลองสปริงจริง (mass-spring-damper) แล้วแปลงเป็น CSS linear() easing
 * → การเด้งดูเป็นธรรมชาติกว่า cubic-bezier เส้นเดียว และ browser เล่นบน compositor ได้ลื่น
 */
function spring({ stiffness, damping, mass = 1 }) {
  const dt = 1 / 120;
  let x = 0;
  let v = 0;
  let t = 0;
  const points = [0];
  while (t < 2) {
    const a = (-stiffness * (x - 1) - damping * v) / mass;
    v += a * dt;
    x += v * dt;
    t += dt;
    points.push(x);
    if (Math.abs(1 - x) < 0.001 && Math.abs(v) < 0.01) break;
  }
  points[points.length - 1] = 1;
  return {
    duration: Math.round(t * 1000),
    easing: supportsLinearEasing
      ? `linear(${points.map((p) => +p.toFixed(3)).join(', ')})`
      : 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  };
}

const AVATAR_SPRING = spring({ stiffness: 300, damping: 21 }); // เด้งนิด ๆ
const ITEM_SPRING = spring({ stiffness: 360, damping: 27 }); // นุ่มกว่า
const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
const EASE_IN = 'cubic-bezier(0.55, 0, 1, 0.45)';
const EASE_IN_OUT = 'cubic-bezier(0.65, 0, 0.35, 1)';

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** transform ที่ทำให้ "รูปใหญ่" ไปทับตำแหน่ง/ขนาดของ "รูปเล็ก" พอดี (เทคนิค FLIP) */
function flipFrom(small, big) {
  const dx = small.left + small.width / 2 - (big.left + big.width / 2);
  const dy = small.top + small.height / 2 - (big.top + big.height / 2);
  return `translate(${dx}px, ${dy}px) scale(${small.width / big.width})`;
}

/* ───────────── component ───────────── */

/**
 * รูปโปรไฟล์มุมขวาบน → กดแล้วพื้นหลังเบลอ รูปโปรไฟล์ลอยออกมาจากตำแหน่งเดิมแล้วขยาย
 * การ์ดชื่อ / "โปรไฟล์" / "ออกจากระบบ" เด้งตามทีละชิ้น — ตอนปิดเล่นย้อนกลับ รูปบินกลับที่เดิม
 *
 * ใช้ Web Animations API (ไม่ใช่ CSS class) เพราะต้องคำนวณตำแหน่งจริงตอนเปิด/ปิด
 * และต้องรู้ว่าแอนิเมชันปิดเล่นจบเมื่อไรก่อนจะ unmount
 */
export function UserMenu({ user, onLogout }) {
  const [anchor, setAnchor] = useState(null); // ตำแหน่งปุ่มรูปโปรไฟล์ (null = ปิด)
  const [closing, setClosing] = useState(false);
  const open = anchor !== null;

  const buttonRef = useRef(null);
  const backdropRef = useRef(null);
  const avatarRef = useRef(null);
  const itemRefs = useRef([]);
  const firstItemRef = useRef(null);
  const bigRectRef = useRef(null);
  const dialogRef = useRef(null);
  const openedByKeyboardRef = useRef(false);
  const stateRef = useRef({ open: false, closing: false });
  stateRef.current = { open, closing };
  const location = useLocation();

  const setItemRef = (i) => (el) => {
    itemRefs.current[i] = el;
  };

  const measure = useCallback(() => {
    const r = buttonRef.current?.getBoundingClientRect();
    if (r) setAnchor({ top: r.top, right: r.right });
  }, []);

  const close = useCallback(async ({ restoreFocus = true } = {}) => {
    const { open: isOpen, closing: isClosing } = stateRef.current;
    if (!isOpen || isClosing) return;
    setClosing(true);

    const reduce = prefersReducedMotion();
    const items = itemRefs.current.filter(Boolean);
    const small = buttonRef.current?.getBoundingClientRect();
    const anims = [
      // ชิ้นเมนูหุบกลับ: ชิ้นล่างสุดก่อน
      ...items
        .slice()
        .reverse()
        .map((el, i) =>
          el.animate(
            [
              { opacity: 1, transform: 'none' },
              { opacity: 0, transform: reduce ? 'none' : 'translateY(-10px) scale(0.85)' },
            ],
            { duration: reduce ? 120 : 170, delay: reduce ? 0 : i * 35, easing: EASE_IN_OUT, fill: 'forwards' },
          ),
        ),
      // พื้นหลังค่อย ๆ ชัดขึ้น
      backdropRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: reduce ? 120 : 320,
        delay: reduce ? 0 : 70,
        easing: EASE_OUT,
        fill: 'forwards',
      }),
    ];
    if (avatarRef.current) {
      // รูปโปรไฟล์บินกลับที่เดิม (ใช้ตำแหน่งตอนเปิดที่จำไว้ — ถ้ากดปิดระหว่างกำลังเปิดก็ไม่เพี้ยน)
      anims.push(
        avatarRef.current.animate(
          reduce || !small || !bigRectRef.current
            ? [{ opacity: 1 }, { opacity: 0 }]
            : [{ transform: 'none' }, { transform: flipFrom(small, bigRectRef.current) }],
          { duration: reduce ? 120 : 420, delay: reduce ? 0 : 60, easing: EASE_IN_OUT, fill: 'forwards' },
        ),
      );
    }

    await Promise.allSettled(anims.filter(Boolean).map((a) => a.finished));
    setClosing(false);
    setAnchor(null);
    if (restoreFocus) buttonRef.current?.focus({ preventScroll: true });
  }, []);

  // เล่นแอนิเมชันเปิด — useLayoutEffect = ก่อน browser วาดเฟรมแรก จึงไม่มีเฟรมที่เห็นสถานะสุดท้ายแวบขึ้นมา
  useLayoutEffect(() => {
    if (!open) return;
    const reduce = prefersReducedMotion();
    const big = avatarRef.current.getBoundingClientRect();
    const small = buttonRef.current.getBoundingClientRect();
    bigRectRef.current = big;

    backdropRef.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduce ? 120 : 360, easing: EASE_OUT });
    avatarRef.current.animate(
      reduce ? [{ opacity: 0 }, { opacity: 1 }] : [{ transform: flipFrom(small, big) }, { transform: 'none' }],
      reduce ? { duration: 120 } : AVATAR_SPRING,
    );
    itemRefs.current.filter(Boolean).forEach((el, i) => {
      el.animate(
        [
          { opacity: 0, transform: reduce ? 'none' : 'translateY(-16px) scale(0.75)' },
          { opacity: 1, transform: 'none' },
        ],
        reduce ? { duration: 120, fill: 'backwards' } : { ...ITEM_SPRING, delay: 110 + i * 60, fill: 'backwards' },
      );
    });
    // เปิดด้วยคีย์บอร์ด → โฟกัสเมนูแรก (เห็นกรอบโฟกัส) / เปิดด้วยเมาส์ → โฟกัสกล่อง dialog เฉย ๆ ไม่ขึ้นกรอบ
    // (ทั้งสองแบบยังกด Esc / Tab ต่อได้)
    (openedByKeyboardRef.current ? firstItemRef.current : dialogRef.current)?.focus({ preventScroll: true });
  }, [open]);

  // เปลี่ยนหน้า (เช่นกด "โปรไฟล์") → หุบเมนูแบบมีแอนิเมชัน
  useEffect(() => {
    if (stateRef.current.open) close({ restoreFocus: false });
  }, [location.pathname, close]);

  // ระหว่างเปิด: Esc ปิด, ล็อกการเลื่อนหน้า, ตามตำแหน่งปุ่มเมื่อย่อ/ขยายหน้าต่าง
  useEffect(() => {
    if (!open) return undefined;
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = 'hidden'; // scrollbar-gutter: stable → หน้าไม่ขยับ
    // หยุดแอนิเมชันที่อยู่ข้างหลัง (มาสคอตลอย ไข่มุก ฯลฯ) — ไม่งั้น backdrop-blur ต้องเบลอทั้งจอใหม่ทุกเฟรม → หน่วง
    html.dataset.overlayOpen = '';
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', measure);
    return () => {
      html.style.overflow = prevOverflow;
      delete html.dataset.overlayOpen;
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', measure);
    };
  }, [open, close, measure]);

  // ย้อมสีพื้นที่เผื่อ scrollbar ด้านขวาให้เข้ากับ overlay (overlay แบบ fixed ครอบตรงนั้นไม่ได้)
  // เริ่มคืนสีตั้งแต่เริ่มปิด → จางไปพร้อม overlay (มี transition ใน index.css)
  const tinted = open && !closing;
  useEffect(() => {
    if (!tinted) return undefined;
    const html = document.documentElement;
    const prev = html.style.backgroundColor;
    html.style.backgroundColor = 'color-mix(in srgb, var(--color-cocoa-900) 25%, var(--color-cocoa-50))';
    return () => {
      html.style.backgroundColor = prev;
    };
  }, [tinted]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          if (open) return;
          openedByKeyboardRef.current = e.detail === 0; // detail = จำนวนคลิก, 0 = กด Enter/Space
          measure();
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`เมนูบัญชีของ ${user.name}`}
        className={`ml-1 rounded-full border-2 border-cocoa-100 bg-white p-0.5 transition-[scale,border-color] duration-200 hover:scale-105 hover:border-brand-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 ${
          open ? 'opacity-0' : ''
        }`}
      >
        <Avatar user={user} className="size-9 text-base" />
      </button>

      {open &&
        createPortal(
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="เมนูบัญชี"
            tabIndex={-1}
            className={`fixed inset-0 z-50 outline-none ${closing ? 'pointer-events-none' : ''}`}
          >
            {/* พื้นหลังเบลอ — กดตรงไหนก็ปิด */}
            <div ref={backdropRef} className="absolute inset-0 bg-cocoa-900/25 backdrop-blur-sm" onClick={() => close()} />

            {/* ชิ้นส่วนลอย: ขอบขวาตรงกับปุ่มรูปโปรไฟล์เดิม */}
            <div
              className="absolute flex -translate-x-full flex-col items-end gap-2.5"
              style={{ top: anchor.top, left: anchor.right }}
            >
              <div ref={avatarRef} className="rounded-full bg-white p-1.5 shadow-xl ring-4 ring-brand-100">
                <Avatar user={user} className="size-22 text-4xl" />
              </div>

              <Bubble ref={setItemRef(0)} className="max-w-[min(18rem,calc(100vw-2rem))] px-5 py-2.5">
                <div className="min-w-0 text-right">
                  <p className="truncate text-base font-bold text-cocoa-900">{user.name}</p>
                  <p className="truncate text-xs text-cocoa-500">
                    {ROLE_LABEL[user.role]} · {user.email}
                  </p>
                </div>
              </Bubble>

              <Bubble
                as={Link}
                ref={(el) => {
                  setItemRef(1)(el);
                  firstItemRef.current = el;
                }}
                to="/profile"
                className="group gap-3 py-2 pr-5 pl-2 hover:border-brand-200 hover:bg-brand-50"
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-brand-100 text-brand-600 transition-[scale,background-color] duration-70 ease-out group-hover:scale-110 group-hover:bg-brand-200">
                  <UserRound className="size-5" aria-hidden />
                </span>
                <span className="font-semibold text-cocoa-800">โปรไฟล์</span>
              </Bubble>

              <Bubble
                as="button"
                ref={setItemRef(2)}
                type="button"
                onClick={onLogout}
                className="group gap-3 py-2 pr-5 pl-2 hover:border-red-200 hover:bg-red-50"
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-red-100 text-red-500 transition-[scale,background-color] duration-70 ease-out group-hover:scale-110 group-hover:bg-red-200">
                  <LogOut className="size-5" aria-hidden />
                </span>
                <span className="font-semibold text-red-600">ออกจากระบบ</span>
              </Bubble>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

/** ชิ้นเมนูทรงแคปซูล */
function Bubble({ as: Tag = 'div', className = '', ref, ...props }) {
  return (
    <Tag
      ref={ref}
      className={`flex items-center rounded-full border-2 border-white bg-white shadow-lg transition-[scale,background-color,border-color] duration-70 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 ${
        Tag === 'div' ? '' : 'hover:scale-[1.04] active:scale-[0.97]'
      } ${className}`}
      {...props}
    />
  );
}

export { ROLE_LABEL };
