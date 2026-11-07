import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cx } from './ui.jsx';

// ใช้สีจากธีมเว็บทั้งหมด (คาราเมล / โกโก้ / ครีม / ชมพูแก้ม) — ดู index.css
const INK = '#251a13'; // cocoa-900 เส้นขอบ
const CREAM = '#fffaf3';
const BOWL = '#e08f3f'; // brand-400
const FOOT = '#ad5c16'; // brand-500
const NOODLE = '#f4d3a8'; // brand-200
const NOODLE_LINE = '#e3a866';
const YOLK = '#f0a23f';
const SHRIMP = '#f39a6b';
const WOOD = '#a8652a';
const STEAM = '#d8cabd'; // cocoa-300
const BLUSH = '#f6a99a';
const PEARL_SHINE = '#9b7a63';

const SHRIMP_PATH = 'M44.5 27.5Q42 17 49.5 15.5Q55 14.8 55.5 20.5';

/**
 * มาสคอต "ชามรวมมิตร" หน้ายิ้ม — เส้น ไข่ต้ม เกี๊ยว กุ้ง ไข่มุก + ตะเกียบ (อาหารหลายชนิดในชามเดียว)
 *
 * @param mood   'happy' | 'sleepy'
 * @param simple true = ตัดรายละเอียดเล็ก ๆ (ไอน้ำ ลายเส้น ลายกุ้ง) สำหรับขนาดเล็ก เช่นโลโก้ / favicon
 */
export function Mascot({ className, mood = 'happy', simple = false }) {
  return (
    <svg viewBox="0 0 64 64" className={cx('shrink-0', className)} aria-hidden="true">
      {/* ไอน้ำ */}
      {!simple && (
        <g stroke={STEAM} strokeWidth="2.4" fill="none" strokeLinecap="round">
          <path d="M14 13c-2.5-2.5 2.5-4.5 0-7.5" />
          <path d="M8.5 17c-2-2 2-3.5 0-6" />
        </g>
      )}

      {/* ตะเกียบ (อยู่หลังอาหาร) */}
      <g strokeLinecap="round">
        <path d="M37 25L52 2.5" stroke={INK} strokeWidth="5" />
        <path d="M37 25L52 2.5" stroke={WOOD} strokeWidth="2.4" />
        <path d="M41 26L57 4.5" stroke={INK} strokeWidth="5" />
        <path d="M41 26L57 4.5" stroke={WOOD} strokeWidth="2.4" />
      </g>

      {/* กองเส้น */}
      <path d="M9 30C9 18 19 12 32 14C45 12 55 18 55 30Z" fill={NOODLE} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      {!simple && (
        <g stroke={NOODLE_LINE} strokeWidth="1.6" fill="none" strokeLinecap="round">
          <path d="M11.5 26.5q2.5-2.6 5 0t5 0" />
          <path d="M38 27q2.2-2.4 4.4 0" />
          <path d="M24 16.5q2-2 4 0" />
        </g>
      )}

      {/* ไข่ต้มครึ่งซีก */}
      <g transform="rotate(-12 17 20)">
        <ellipse cx="17" cy="20" rx="7.2" ry="6" fill={CREAM} stroke={INK} strokeWidth="2.2" />
        <circle cx="17.4" cy="20.4" r="3.3" fill={YOLK} />
      </g>

      {/* เกี๊ยว */}
      <path d="M23.5 23Q31.5 3.5 39.5 23Z" fill={CREAM} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      {!simple && <path d="M29 15l1.2 2.6M31.5 12.5v3M34 15l-1.2 2.6" stroke={INK} strokeWidth="1.3" strokeLinecap="round" />}

      {/* ไข่มุก */}
      <circle cx="22.5" cy="26" r="2.1" fill={INK} />
      <circle cx="34" cy="26.3" r="1.8" fill={INK} />
      {!simple && (
        <>
          <circle cx="21.9" cy="25.3" r="0.6" fill={PEARL_SHINE} />
          <circle cx="33.5" cy="25.7" r="0.5" fill={PEARL_SHINE} />
        </>
      )}

      {/* กุ้งงอห้อยขอบชาม */}
      <path d={SHRIMP_PATH} fill="none" stroke={INK} strokeWidth="6.6" strokeLinecap="round" />
      <path d={SHRIMP_PATH} fill="none" stroke={SHRIMP} strokeWidth="3.8" strokeLinecap="round" />
      {!simple && <path d="M43.3 21.5l2.8.2M45 17.6l2.2 1.7M49.4 15.6l.2 2.6" stroke={CREAM} strokeWidth="1.1" strokeLinecap="round" />}
      <path d="M55.5 21l-3.2 4.2l3.2-1l3.2 1z" fill={SHRIMP} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />

      {/* ฐาน + ตัวชาม + ขอบชาม */}
      <rect x="23" y="50.5" width="18" height="6" rx="2.5" fill={FOOT} stroke={INK} strokeWidth="2.2" />
      <path d="M7 30A25 23 0 0 0 57 30Z" fill={BOWL} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      <rect x="5" y="27.5" width="54" height="5" rx="2.5" fill={CREAM} stroke={INK} strokeWidth="2.2" />

      {/* หน้า */}
      {mood === 'sleepy' ? (
        <path d="M22.5 40.5q2.5 2 5 0M36.5 40.5q2.5 2 5 0" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      ) : (
        <>
          <circle cx="25" cy="40" r="2.5" fill={INK} />
          <circle cx="39" cy="40" r="2.5" fill={INK} />
          <circle cx="25.8" cy="39.2" r="0.8" fill="#fff" />
          <circle cx="39.8" cy="39.2" r="0.8" fill="#fff" />
        </>
      )}
      <path d="M29.5 44q2.5 2.6 5 0" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="19.5" cy="44.5" rx="2.8" ry="1.7" fill={BLUSH} />
      <ellipse cx="44.5" cy="44.5" rx="2.8" ry="1.7" fill={BLUSH} />
    </svg>
  );
}

/* ───────────── อาหารจิ๋วลอยวนรอบมาสคอต ───────────── */

const ICON = { stroke: INK, strokeWidth: 1.6, strokeLinejoin: 'round' };

const FOODS = [
  // ไข่ต้ม
  <g key="egg">
    <ellipse cx="12" cy="12" rx="9" ry="7.5" fill={CREAM} {...ICON} />
    <circle cx="12.4" cy="12.3" r="4" fill={YOLK} />
  </g>,
  // เกี๊ยว
  <g key="dumpling">
    <path d="M2.5 17.5Q12 -0.5 21.5 17.5Z" fill={CREAM} {...ICON} />
    <path d="M9 9.5l1 2.2M12 7.5v2.6M15 9.5l-1 2.2" stroke={INK} strokeWidth="1.1" strokeLinecap="round" />
  </g>,
  // กุ้ง
  <g key="shrimp">
    <path d="M6 19Q3.5 7.5 12 6.5Q18 6 18.5 11.5" fill="none" stroke={INK} strokeWidth="5.6" strokeLinecap="round" />
    <path d="M6 19Q3.5 7.5 12 6.5Q18 6 18.5 11.5" fill="none" stroke={SHRIMP} strokeWidth="3.2" strokeLinecap="round" />
    <path d="M18.5 12l-3 3.8 3-.9 3 .9z" fill={SHRIMP} {...ICON} strokeWidth="1.3" />
  </g>,
  // ซูชิแซลมอน
  <g key="sushi">
    <rect x="3.5" y="11" width="17" height="8.5" rx="4" fill={CREAM} {...ICON} />
    <rect x="2" y="6" width="20" height="7.5" rx="3.75" fill={SHRIMP} {...ICON} />
    <path d="M7 8l2 3.5M11.5 7.5l2 4M16 8l1.8 3.2" stroke={CREAM} strokeWidth="1.1" strokeLinecap="round" />
  </g>,
  // ข้าวปั้น
  <g key="onigiri">
    <path d="M12 3C14.5 3 21.5 14.5 21.5 17.5C21.5 21 2.5 21 2.5 17.5C2.5 14.5 9.5 3 12 3Z" fill={CREAM} {...ICON} />
    <rect x="8" y="13.5" width="8" height="6.8" rx="1" fill="#33271f" />
  </g>,
  // ดังโงะ
  <g key="dango">
    <path d="M12 23V1.5" stroke={WOOD} strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="5.5" r="3.6" fill={BLUSH} {...ICON} />
    <circle cx="12" cy="12" r="3.6" fill={CREAM} {...ICON} />
    <circle cx="12" cy="18.5" r="3.6" fill={NOODLE} {...ICON} />
  </g>,
  // ไข่มุก (ชานม)
  <g key="pearl">
    <circle cx="12" cy="12" r="7" fill={INK} />
    <circle cx="9.6" cy="9.4" r="2" fill={PEARL_SHINE} />
  </g>,
];

/* ───────────── วงแหวนอาหารแบบดาวเสาร์ ───────────── */

// สัดส่วนเทียบกับขนาดมาสคอต (w = ความกว้างกล่องมาสคอต)
const RING = {
  // รัศมีแนวนอนของวงแหวน — ไล่ค่าตามความกว้างจอ: จอแคบ (≤ fromVw) ใช้ min, จอกว้าง (≥ toVw) ใช้ max, ระหว่างนั้นค่อย ๆ เพิ่ม
  rx: { min: 0.72, max: 0.99, fromVw: 360, toVw: 1280 },
  ry: 0.2, // รัศมีแนวตั้ง (เตี้ย = มองจากมุมเฉียง)
  cy: 0.66, // จุดศูนย์กลางแนวตั้ง — ขอบหน้าของวงแหวนจะผ่านใต้หน้ายิ้ม ไม่ทับปาก
  tilt: -14, // องศาที่วงแหวนเอียง
  secondsPerTurn: 36, // ช้า ๆ
};
const RING_STROKES = [
  // สีครีม — วงแหวนอยู่บนการ์ดสีคาราเมล
  { scale: 1, color: '#fff4e3', width: 3, opacity: 0.9 },
  { scale: 0.86, color: '#f4d3a8', width: 2, opacity: 0.75 }, // brand-200
];

/** rx (สัดส่วนต่อขนาดมาสคอต) ตามความกว้างจอปัจจุบัน */
function ringRxFor(viewportWidth) {
  const { min, max, fromVw, toVw } = RING.rx;
  const k = Math.min(1, Math.max(0, (viewportWidth - fromVw) / (toVw - fromVw)));
  return min + (max - min) * k;
}

/** ระยะที่วงแหวน + อาหารยื่นออกนอกกล่องมาสคอต (px) — ใช้เป็น margin ให้ layout เผื่อที่ไว้ */
function ringMargins({ w, h, item, rxRatio }) {
  const rx = w * rxRatio;
  const ry = w * RING.ry;
  const t = (RING.tilt * Math.PI) / 180;
  // ครึ่งความกว้าง/สูงของวงรีที่เอียงแล้ว
  const halfW = Math.hypot(rx * Math.cos(t), ry * Math.sin(t));
  const halfH = Math.hypot(rx * Math.sin(t), ry * Math.cos(t));
  const cy = h * RING.cy;
  const pad = item / 2;
  const side = Math.max(0, Math.ceil(halfW + pad - w / 2));
  return {
    marginLeft: side,
    marginRight: side,
    marginTop: Math.max(0, Math.ceil(halfH + pad - cy)),
    marginBottom: Math.max(0, Math.ceil(cy + halfH + pad - h)),
  };
}

/**
 * มาสคอต + อาหารจิ๋วโคจรเป็นวงแหวนแบบดาวเสาร์
 *
 * - ทางโคจรเป็นวงรีเอียง ครึ่งหลังลอดไปหลังชาม (เล็กลง/จางลง) ครึ่งหน้าผ่านหน้าชาม
 * - จุดกึ่งกลางของอาหารแต่ละชิ้นอยู่บนเส้นวงแหวนเส้นนอก (rx) พอดี — ปรับ RING แล้วอาหารกับเส้นขยับไปด้วยกัน
 * - เส้นวงแหวนแบ่งเป็นครึ่งหลัง (อยู่ใต้ชาม) กับครึ่งหน้า (อยู่บนชาม) เหมือนชามสวมวงแหวนอยู่
 * - คำนวณตำแหน่งด้วย JS ทุกเฟรม (CSS ล้วนสลับลำดับหน้า–หลังให้ตรงจังหวะไม่ได้) แต่เขียนแค่ transform/opacity
 *   ของ 7 ชิ้น → เบามาก; หยุดเองเมื่อเลื่อนพ้นจอ / สลับแท็บ / มี overlay เบลอทับ / ผู้ใช้ตั้งค่าลดภาพเคลื่อนไหว
 */
export function MascotRing({ className, mascotClassName, itemClassName = 'size-7' }) {
  const boxRef = useRef(null);
  const itemRefs = useRef([]);
  const [size, setSize] = useState(null);

  // ขนาดมาสคอต / ความกว้างจอเปลี่ยน → วัดใหม่
  useLayoutEffect(() => {
    const el = boxRef.current;
    const measure = () => {
      const icon = itemRefs.current[0]?.firstElementChild;
      setSize({
        w: el.offsetWidth,
        h: el.offsetHeight,
        item: icon ? parseFloat(getComputedStyle(icon).width) : 0,
        rxRatio: ringRxFor(document.documentElement.clientWidth),
      });
    };
    const ro = new ResizeObserver(measure); // ขนาดมาสคอตเปลี่ยนตาม breakpoint
    ro.observe(el);
    window.addEventListener('resize', measure); // rx เปลี่ยนตามความกว้างจอทุกพิกเซล
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  useEffect(() => {
    if (!size) return undefined;
    const rx = size.w * size.rxRatio;
    const ry = size.w * RING.ry;
    const cx = size.w / 2;
    const cy = size.h * RING.cy;
    const tilt = (RING.tilt * Math.PI) / 180;
    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);
    const step = (Math.PI * 2) / FOODS.length;
    const speed = (Math.PI * 2) / RING.secondsPerTurn; // rad/s
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const place = (angle) => {
      itemRefs.current.forEach((el, i) => {
        if (!el) return;
        const t = angle + i * step;
        const x = rx * Math.cos(t);
        const y = ry * Math.sin(t);
        const depth = Math.sin(t); // -1 = หลังสุด, 1 = หน้าสุด
        const near = (depth + 1) / 2;
        el.style.transform = `translate(${cx + x * cosT - y * sinT}px, ${cy + x * sinT + y * cosT}px) translate(-50%, -50%) scale(${0.68 + 0.32 * near})`;
        el.style.opacity = String(0.6 + 0.4 * near);
        el.style.zIndex = depth > 0 ? '2' : '0';
      });
    };

    let angle = -Math.PI / 2;
    place(angle);
    if (reduce) return undefined;

    let raf = 0;
    let last = 0;
    let visible = true;
    const frame = (now) => {
      if (!visible) return;
      const paused = 'overlayOpen' in document.documentElement.dataset; // เมนูรูปโปรไฟล์เปิดอยู่
      if (last && !paused) angle += (Math.min(now - last, 100) / 1000) * speed;
      last = now;
      place(angle);
      raf = requestAnimationFrame(frame);
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    });
    io.observe(boxRef.current);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [size]);

  // เว้นที่รอบมาสคอตให้พอดีกับวงแหวน (คำนวณจาก RING) → ปรับ rx/ry/tilt เท่าไร layout ก็ไม่ทับข้อความ
  const margins = size && ringMargins(size);

  const ringArcs = (half) =>
    size &&
    RING_STROKES.map(({ scale, color, width, opacity }) => {
      const rx = size.w * size.rxRatio * scale;
      const ry = size.w * RING.ry * scale;
      // ครึ่งหลัง = โค้งบน (ซ้าย→ขวาผ่านด้านบน), ครึ่งหน้า = โค้งล่าง
      const d = half === 'back' ? `M${-rx} 0A${rx} ${ry} 0 0 1 ${rx} 0` : `M${rx} 0A${rx} ${ry} 0 0 1 ${-rx} 0`;
      return <path key={scale} d={d} fill="none" stroke={color} strokeWidth={width} strokeOpacity={opacity} strokeLinecap="round" />;
    });
  const ringSvg = (half, z) =>
    size && (
      <svg
        className={cx('pointer-events-none absolute overflow-visible', z)}
        style={{ left: size.w / 2, top: size.h * RING.cy, width: 1, height: 1 }}
        aria-hidden="true"
      >
        <g transform={`rotate(${RING.tilt})`}>{ringArcs(half)}</g>
      </svg>
    );

  return (
    <div ref={boxRef} className={cx('relative isolate', className)} style={margins ?? undefined} aria-hidden="true">
      {/* แสงนวลสีคาราเมลด้านหลัง — ทำให้มาสคอตเป็นจุดเด่นโดยไม่ต้องมีกรอบ */}
      <div className="pointer-events-none absolute top-[58%] left-1/2 size-[190%] -translate-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_244_227/0.75),rgb(244_211_168/0.4)_55%,transparent)]" />
      {/* เงาบนพื้น — อยู่กับที่ หดเมื่อชามลอยขึ้น ขยายเมื่อชามลงมา (จังหวะเดียวกับ animate-float) */}
      <div className="animate-shadow-breathe pointer-events-none absolute top-[97%] left-1/2 h-[11%] w-[62%] -translate-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(74_46_22/0.28),transparent)]" />

      {/* ส่วนที่ลอย: ชาม + วงแหวน + อาหาร ลอยขึ้นลงไปด้วยกัน */}
      <div className="animate-float relative isolate">
      {ringSvg('back', 'z-0')}
      <Mascot className={cx('relative z-[1] block drop-shadow-md', mascotClassName)} />
      {ringSvg('front', 'z-[2]')}
      {FOODS.map((food, i) => (
        <div
          key={food.key}
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
          className="pointer-events-none absolute top-0 left-0 will-change-transform"
          style={{ opacity: size ? undefined : 0 }}
        >
          <svg viewBox="0 0 24 24" className={cx('block drop-shadow-sm', itemClassName)}>
            {food}
          </svg>
        </div>
      ))}
      </div>
    </div>
  );
}

const PEARL_LAYOUTS = {
  /* [left%, bottom%, size(px), delay(s)] */
  hero: [
    [70, 12, 26, 0],
    [76, 30, 18, 0.6],
    [83, 8, 34, 1.2],
    [90, 28, 22, 0.3],
    [62, 4, 16, 1.8],
    [95, 6, 14, 0.9],
  ],
  corner: [
    [6, 8, 30, 0],
    [14, 22, 18, 0.8],
    [86, 70, 26, 0.4],
    [92, 84, 16, 1.4],
    [80, 88, 12, 2],
  ],
};

/** เม็ดไข่มุกลอยตกแต่งพื้นหลัง (absolute — parent ต้องเป็น relative + overflow-hidden) */
export function Pearls({ layout = 'hero', className }) {
  return (
    <div className={cx('pointer-events-none absolute inset-0', className)} aria-hidden="true">
      {PEARL_LAYOUTS[layout].map(([left, bottom, size, delay], i) => (
        <span
          key={i}
          className="pearl animate-float absolute"
          style={{ left: `${left}%`, bottom: `${bottom}%`, width: size, height: size, animationDelay: `${delay}s` }}
        />
      ))}
    </div>
  );
}
