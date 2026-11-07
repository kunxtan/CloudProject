import { UtensilsCrossed } from 'lucide-react';
import { cx } from './ui.jsx';

/** รูปหน้าร้าน — ถ้าไม่มีรูปแสดง placeholder สีตามชื่อร้าน */
const GRADIENTS = [
  'from-brand-200 to-brand-400',
  'from-brand-300 to-brand-500',
  'from-cocoa-300 to-cocoa-600',
  'from-amber-100 to-brand-400',
];

export function RestaurantCover({ restaurant, className }) {
  if (restaurant.coverImageUrl) {
    return <img src={restaurant.coverImageUrl} alt="" className={cx('object-cover', className)} loading="lazy" />;
  }
  const g = GRADIENTS[restaurant.id % GRADIENTS.length];
  return (
    <div className={cx('relative flex items-center justify-center overflow-hidden bg-linear-to-br', g, className)} aria-hidden>
      <span className="pearl absolute bottom-3 left-5 size-5 opacity-80" />
      <span className="pearl absolute bottom-8 left-11 size-3 opacity-70" />
      <span className="pearl absolute right-6 bottom-4 size-4 opacity-80" />
      <span className="flex size-18 items-center justify-center rounded-full bg-white/35 ring-4 ring-white/25">
        <UtensilsCrossed className="size-9 text-white" />
      </span>
    </div>
  );
}

/** โลโก้วงกลม — มี relative เพื่อให้ลอยทับรูปหน้าร้าน (ซึ่งเป็น relative) ได้ตอนใช้ margin ติดลบ ไม่งั้นครึ่งบนจะโดนรูปหน้าร้านบัง */
export function RestaurantLogo({ restaurant, className }) {
  if (restaurant.logoUrl) {
    return <img src={restaurant.logoUrl} alt="" className={cx('relative shrink-0 rounded-full object-cover ring-4 ring-brand-100', className)} />;
  }
  return (
    <div
      className={cx('relative flex shrink-0 items-center justify-center rounded-full bg-brand-500 font-display font-bold text-white ring-4 ring-brand-100', className)}
      aria-hidden
    >
      {restaurant.name.slice(0, 1)}
    </div>
  );
}

/** รูปสี่เหลี่ยมเล็กสำหรับรายการร้าน — ใช้โลโก้ก่อน ไม่มีค่อยใช้รูปหน้าร้าน ไม่มีทั้งคู่แสดง placeholder */
export function RestaurantThumb({ restaurant, className }) {
  const src = restaurant.logoUrl || restaurant.coverImageUrl;
  if (src) {
    return <img src={src} alt="" loading="lazy" className={cx('shrink-0 bg-cocoa-100 object-cover', className)} />;
  }
  const g = GRADIENTS[restaurant.id % GRADIENTS.length];
  return (
    <div className={cx('relative flex shrink-0 items-center justify-center overflow-hidden bg-linear-to-br', g, className)} aria-hidden>
      <span className="pearl absolute bottom-2 left-2.5 size-3 opacity-80" />
      <span className="pearl absolute right-2.5 bottom-2.5 size-2.5 opacity-70" />
      <UtensilsCrossed className="size-8 text-white drop-shadow-sm" />
    </div>
  );
}
