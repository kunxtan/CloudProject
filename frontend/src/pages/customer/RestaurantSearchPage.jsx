import { ChevronLeft, ChevronRight, Coffee, Moon, Search, Sun, Sunrise, Sunset } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { errorMessage } from '../../api/client.js';
import { restaurantApi } from '../../api/endpoints.js';
import { Mascot, MascotRing } from '../../components/Mascot.jsx';
import { RestaurantCard } from '../../components/RestaurantCard.jsx';
import { Button, EmptyState, ErrorBox, Spinner, cx } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { usePolling } from '../../hooks/usePolling.js';

const PAGE_SIZE = 12;


// คำทักทายตามช่วงเวลา (เวลาไทย)
const GREETINGS = [
  { from: 5, to: 10, icon: Sunrise, hello: 'อรุณสวัสดิ์', hint: 'มื้อเช้าวันนี้กินอะไรดี' },
  { from: 10, to: 14, icon: Sun, hello: 'เที่ยงแล้ว', hint: 'ไปหาของอร่อยกัน' },
  { from: 14, to: 17, icon: Coffee, hello: 'บ่ายแล้ว', hint: 'ขอของหวานสักหน่อยไหม' },
  { from: 17, to: 21, icon: Sunset, hello: 'สวัสดีตอนเย็น', hint: 'มื้อเย็นนี้กินอะไรดี' },
  { from: 21, to: 29, icon: Moon, hello: 'ดึกแล้วนะ', hint: 'หิวรอบดึกใช่ไหม' }, // 21:00–04:59
];
const bangkokHour = () =>
  Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Bangkok' }).format(new Date()));

export default function RestaurantSearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [input, setInput] = useState(q);
  const searchBarRef = useRef(null);
  const stuck = useIsStuck(searchBarRef);

  // debounce 300ms ก่อนค้นหา
  useEffect(() => {
    const t = setTimeout(() => {
      if (input.trim() !== q) setParams(input.trim() ? { q: input.trim() } : {}, { replace: true });
    }, 300);
    return () => clearTimeout(t);
  }, [input, q, setParams]);

  // จำนวนคิวรอเปลี่ยนตลอด → รีเฟรชทุก 15 วินาที
  const { data, error, loading } = usePolling(
    () => restaurantApi.search({ q: q || undefined, page, pageSize: PAGE_SIZE }),
    15_000,
    [q, page],
  );

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const goPage = (p) => setParams({ ...(q && { q }), page: String(p) });

  return (
    <div>
      {/* การ์ดหัวหน้าสีคาราเมล — ฝั่งข้อความเข้ม (ตัวอักษรขาวอ่านชัด ≥ 4.8:1) ฝั่งมาสคอตสว่าง
          มือถือไล่บน→ล่าง (มาสคอตอยู่บน) / จอ sm ขึ้นไปไล่ขวา→ซ้าย (มาสคอตอยู่ขวา) */}
      <section className="relative mb-4 overflow-hidden rounded-[2rem] border-2 border-brand-300/70 bg-linear-to-b from-brand-400 via-brand-600 to-brand-700 shadow-[0_6px_0_0_var(--color-brand-700),0_24px_40px_-24px_rgb(120_63_21/0.7)] sm:rounded-[2.5rem] sm:bg-linear-to-l sm:via-brand-600 sm:to-brand-600 lg:via-brand-500">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-20 size-48 rounded-full bg-brand-300/40 blur-3xl sm:size-64 lg:-top-32 lg:-right-24 lg:size-96 lg:bg-brand-300/45" />
        <div aria-hidden className="pointer-events-none absolute -bottom-36 -left-24 size-80 rounded-full bg-brand-800/35 blur-3xl" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,rgb(255_250_243/0.14)_2px,transparent_2.6px)] [background-size:22px_22px] [mask-image:linear-gradient(to_left,black,transparent_70%)]"
        />

        {/* มือถือ: มาสคอตอยู่บน ข้อความอยู่ล่าง (กึ่งกลาง) / จอ sm ขึ้นไป: ข้อความซ้าย มาสคอตขวา */}
        <div className="relative flex flex-col-reverse items-center gap-3 px-4 py-5 sm:flex-row sm:justify-between sm:gap-12 sm:px-9 sm:py-8 lg:px-12">
        <div className="w-full min-w-0 text-center sm:w-auto sm:text-left">
          <Greeting />
          <h1 className="text-[1.75rem] font-bold text-white drop-shadow-[0_2px_0_rgb(98_52_23/0.45)] min-[400px]:text-3xl sm:text-4xl lg:text-5xl">
            หิวแล้วใช่ไหม?
          </h1>
          <p className="mx-auto mt-1.5 max-w-md text-xs text-brand-50 sm:mx-0 sm:text-sm lg:max-w-xl">จองคิวร้านโปรดได้จากทุกที่ ดูคิวแบบเรียลไทม์</p>

        </div>
        {/* มาสคอต + อาหารจิ๋วโคจรเป็นวงแหวนแบบดาวเสาร์ */}
        <MascotRing
          className="shrink-0"
          mascotClassName="size-20 sm:size-24 lg:size-32 2xl:size-40"
          itemClassName="size-5 sm:size-6 lg:size-8 2xl:size-10"
        />
        </div>
      </section>

      {/* แถบค้นหาติดขอบบน (ใต้ header) ตอนเลื่อนหน้า — พอติดแล้วมีพื้นเต็มความกว้างจอ + เส้นขอบล่าง */}
      <div
        ref={searchBarRef}
        className={cx(
          'sticky top-[var(--header-h,72px)] z-10 -mx-4 mb-6 px-4 py-3 transition-shadow sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8',
          stuck &&
            'bg-cocoa-50 [box-shadow:0_0_0_100vmax_var(--color-cocoa-50),0_2px_0_100vmax_var(--color-cocoa-100)] [clip-path:inset(0_-100vmax_-2px)]',
        )}
      >
        <div className="relative">
          <Search className="absolute top-1/2 left-5 size-5 -translate-y-1/2 text-brand-500" aria-hidden />
          <input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="ค้นหาชื่อร้านหรือย่าน เช่น ชาบู, สยาม"
            aria-label="ค้นหาร้านอาหาร"
            className="h-13 w-full rounded-full border-2 border-cocoa-200 bg-white pr-5 pl-13 text-cocoa-900 shadow-pop-soft transition-colors placeholder:text-cocoa-400 hover:border-brand-200 focus:border-brand-400 focus:ring-4 focus:ring-brand-200/50 focus:outline-none"
          />
        </div>
      </div>

      <h2 className="mb-4 text-xl font-bold">{q ? `ผลการค้นหา "${q}"` : 'เลือกจองคิวเลย'}</h2>

      {error && !data && <ErrorBox>{errorMessage(error)}</ErrorBox>}
      {loading && !data ? (
        <Spinner />
      ) : data?.items.length === 0 ? (
        <EmptyState
          illustration={<Mascot mood="sleepy" className="size-24" />}
          title="ไม่พบร้านอาหาร"
          description="ลองค้นหาด้วยคำอื่น หรือดูร้านทั้งหมด"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:gap-4">
          {data?.items.map((r) => (
            <RestaurantCard key={r.id} restaurant={r} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => goPage(page - 1)}>
            ก่อนหน้า
          </Button>
          <span className="text-sm text-cocoa-600">
            หน้า {page} / {totalPages}
          </span>
          <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => goPage(page + 1)}>
            ถัดไป <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>
      )}
    </div>
  );
}

/** true เมื่อ element แบบ sticky ติดอยู่ใต้ header แล้ว (เลื่อนผ่านตำแหน่งเดิมของมัน) */
function useIsStuck(ref) {
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const check = () => {
      const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 72;
      setStuck(window.scrollY > 0 && el.getBoundingClientRect().top <= headerH + 1);
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [ref]);
  return stuck;
}

/** ป้ายทักทายตามช่วงเวลา — login แล้วทักด้วยชื่อ, ยังไม่ login แนะนำมื้อตามเวลา (อัปเดตทุก 5 นาที) */
function Greeting() {
  const { user } = useAuth();
  const [hour, setHour] = useState(bangkokHour);
  useEffect(() => {
    const t = setInterval(() => setHour(bangkokHour()), 5 * 60_000);
    return () => clearInterval(t);
  }, []);

  const h = hour < 5 ? hour + 24 : hour;
  const g = GREETINGS.find((x) => h >= x.from && h < x.to) ?? GREETINGS[0];
  const Icon = g.icon;
  const name = user?.name?.trim().split(/\s+/)[0];
  return (
    <p className="mb-3 inline-flex max-w-full items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 shadow-pop-soft">
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">{name ? `${g.hello} ${name} · ${g.hint}` : `${g.hello} · ${g.hint}`}</span>
    </p>
  );
}

