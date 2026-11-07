import { ChevronRight, Clock, MapPin } from 'lucide-react';
import { Link } from 'react-router';
import { formatWait } from '../utils/format.js';
import { RestaurantThumb } from './RestaurantImage.jsx';
import { OpenBadge } from './StatusBadge.jsx';
import { cx } from './ui.jsx';

/** ร้านหนึ่งแถว: รูป | ชื่อ-ที่อยู่-สถานะ | กล่องจำนวนคิวที่รออยู่ (ขวา) */
export function RestaurantCard({ restaurant: r }) {
  return (
    <Link
      to={`/restaurants/${r.id}`}
      className="group flex items-stretch gap-2.5 rounded-3xl min-[380px]:gap-3 border-2 border-cocoa-100 bg-white p-2.5 shadow-soft transition duration-200 hover:-translate-y-1 hover:rotate-[-0.6deg] hover:border-brand-200 focus-visible:outline-2 focus-visible:outline-brand-500 sm:gap-4 sm:p-3"
    >
      <RestaurantThumb restaurant={r} className={cx('size-16 self-center rounded-2xl min-[380px]:size-20 sm:size-24', !r.isOpen && 'opacity-60 grayscale-[40%]')} />

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-1">
        <h3 className="truncate text-base font-bold text-cocoa-900 group-hover:text-brand-600 sm:text-lg">{r.name}</h3>
        {r.address && (
          <p className="flex items-center gap-1 text-xs text-cocoa-500 sm:text-sm">
            <MapPin className="size-3.5 shrink-0 sm:size-4" aria-hidden />
            <span className="truncate">{r.address}</span>
          </p>
        )}
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <OpenBadge isOpen={r.isOpen} />
          {r.isOpen && (
            <span className="inline-flex items-center gap-1 rounded-full bg-cocoa-100 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-cocoa-700">
              <Clock className="size-3.5" aria-hidden />
              {formatWait(r.estWaitMin)}
            </span>
          )}
        </div>
      </div>

      {/* กล่องจำนวนคิวที่รออยู่ */}
      <div
        className={cx(
          'flex w-16 shrink-0 flex-col items-center justify-center rounded-2xl py-2 min-[380px]:w-20 sm:w-24',
          r.isOpen ? 'bg-brand-50' : 'bg-cocoa-100',
        )}
        aria-label={`รออยู่ ${r.waitingCount} คิว`}
      >
        <span className="text-xs font-semibold text-cocoa-500">รออยู่</span>
        <span
          className={cx(
            'font-display text-3xl leading-tight font-bold tabular-nums sm:text-4xl',
            r.isOpen ? 'text-brand-600' : 'text-cocoa-500',
          )}
        >
          {r.waitingCount}
        </span>
        <span className="text-xs font-semibold text-cocoa-500">คิว</span>
      </div>

      <ChevronRight className="hidden size-5 shrink-0 self-center text-cocoa-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-400 sm:block" aria-hidden />
    </Link>
  );
}
