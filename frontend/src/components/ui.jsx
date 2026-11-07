import { Loader2, Moon, Store, X } from 'lucide-react';
import { useEffect, useId } from 'react';

const cx = (...c) => c.filter(Boolean).join(' ');

const BUTTON_VARIANTS = {
  primary: 'bg-brand-500 text-white shadow-pop hover:bg-brand-600',
  secondary: 'bg-white text-cocoa-800 border-2 border-cocoa-200 shadow-pop-soft hover:bg-brand-50 hover:border-brand-200',
  ghost: 'text-cocoa-600 hover:bg-cocoa-100',
  danger: 'bg-white text-red-600 border-2 border-red-200 shadow-[0_3px_0_0_var(--color-red-200)] hover:bg-red-50',
  dangerSolid: 'bg-red-600 text-white shadow-[0_4px_0_0_var(--color-red-800)] hover:bg-red-700', // ตัวอักษรขาวบน red-600 = 4.8:1
  success: 'bg-emerald-700 text-white shadow-pop-success hover:bg-emerald-800', // ตัวอักษรขาว 5.5:1
};
const BUTTON_SIZES = {
  sm: 'h-9 px-4 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-13 px-7 text-base gap-2',
};

export function Button({ variant = 'primary', size = 'md', loading, disabled, className, children, icon: Icon, ...props }) {
  return (
    <button
      disabled={disabled || loading}
      className={cx(
        // ปุ่มทรงแคปซูล + กดแล้วยุบลงเหมือนกดปุ่มจริง (เงาล่างหายไป)
        'inline-flex items-center justify-center rounded-full font-semibold transition-all duration-150 hover:-translate-y-px active:translate-y-[3px] active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:translate-y-0',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : Icon && <Icon className="size-4" aria-hidden />}
      {children}
    </button>
  );
}

export function Field({ label, hint, error, children, id }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block pl-2 text-sm font-semibold text-cocoa-700">
          {label}
        </label>
      )}
      {children}
      {error ? <p className="pl-2 text-sm text-red-600">{error}</p> : hint && <p className="pl-2 text-xs text-cocoa-500">{hint}</p>}
    </div>
  );
}

const inputClass =
  'block w-full border-2 border-cocoa-200 bg-white px-4 py-2.5 text-sm text-cocoa-900 transition-colors placeholder:text-cocoa-400 hover:border-brand-200 focus:border-brand-400 focus:ring-4 focus:ring-brand-200/50 focus:outline-none disabled:bg-cocoa-100';

export function Input({ label, hint, error, className, ...props }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} id={id}>
      <input id={id} className={cx(inputClass, 'rounded-full', className)} {...props} />
    </Field>
  );
}

export function Textarea({ label, hint, error, className, ...props }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} id={id}>
      <textarea id={id} className={cx(inputClass, 'min-h-24 rounded-2xl', className)} {...props} />
    </Field>
  );
}

export function Card({ className, children, ...props }) {
  return (
    <div className={cx('rounded-3xl border-2 border-cocoa-100 bg-white shadow-soft', className)} {...props}>
      {children}
    </div>
  );
}

export function Spinner({ className, label = 'กำลังโหลด…' }) {
  return (
    <div className={cx('flex items-center justify-center gap-2 py-12 text-cocoa-500', className)} role="status">
      <Loader2 className="size-5 animate-spin" aria-hidden />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon, illustration, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-cocoa-200 bg-white/80 px-6 py-12 text-center">
      {illustration ? (
        <div className="mb-3">{illustration}</div>
      ) : Icon && (
        <div className="mb-3 rounded-full bg-brand-100 p-4 text-brand-500 ring-4 ring-brand-50">
          <Icon className="size-7" aria-hidden />
        </div>
      )}
      <p className="text-lg font-semibold text-cocoa-800">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-cocoa-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBox({ children }) {
  if (!children) return null;
  return (
    <div className="rounded-2xl border-2 border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">
      {children}
    </div>
  );
}

/** inlineActions = ปุ่มอยู่ขวามือบรรทัดเดียวกับหัวข้อแม้บนมือถือ (ใช้กับปุ่มเล็ก ๆ ปุ่มเดียว) */
export function PageHeader({ title, description, actions, inlineActions = false }) {
  return (
    <div
      className={cx(
        'mb-6 flex gap-3',
        inlineActions ? 'flex-row items-start justify-between sm:items-center' : 'flex-col sm:flex-row sm:items-end sm:justify-between',
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-cocoa-900 sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-cocoa-500">{description}</p>}
      </div>
      {actions && <div className={cx('flex flex-wrap gap-2', inlineActions && 'shrink-0')}>{actions}</div>}
    </div>
  );
}

/**
 * สวิตช์ "เปิด/ปิดรับคิว" แบบแคปซูลใหญ่ มีข้อความในตัว
 * เปิด = เขียวเข้ม (ตัวอักษรขาว 5.5:1) + จุดกะพริบ, ปิด = ครีมน้ำตาล — ปุ่มกลมเลื่อนข้ามแบบสปริง
 */
export function OpenToggle({ isOpen, onChange, busy = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOpen}
      aria-label={isOpen ? 'เปิดรับคิวอยู่ — กดเพื่อปิดรับคิว' : 'ปิดรับคิวอยู่ — กดเพื่อเปิดรับคิว'}
      disabled={busy}
      onClick={() => onChange(!isOpen)}
      className={cx(
        'relative h-11 w-37 shrink-0 rounded-full border-2 transition-[background-color,border-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 disabled:cursor-wait sm:w-40',
        isOpen
          ? 'border-emerald-800 bg-emerald-700 shadow-[0_3px_0_0_var(--color-emerald-900)]'
          : 'border-cocoa-200 bg-cocoa-100 shadow-pop-soft hover:border-cocoa-300',
      )}
    >
      {/* ข้อความอยู่ฝั่งตรงข้ามกับปุ่มกลม */}
      <span
        className={cx(
          'absolute inset-y-0 flex items-center justify-center gap-1.5 text-sm font-bold transition-[left,right,color] duration-300',
          isOpen ? 'right-10 left-0 text-white' : 'right-0 left-10 text-cocoa-600',
        )}
      >
        {isOpen && (
          <span className="relative flex size-2" aria-hidden>
            <span className="absolute inline-flex size-full rounded-full bg-emerald-300 opacity-75 motion-safe:animate-ping" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-300" />
          </span>
        )}
        {isOpen ? 'เปิดรับคิว' : 'ปิดรับคิว'}
      </span>
      {/* ปุ่มกลม */}
      <span
        className={cx(
          'absolute top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md transition-[left] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
          isOpen ? 'left-[calc(100%-2.25rem)]' : 'left-1',
        )}
        aria-hidden
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin text-cocoa-500" />
        ) : isOpen ? (
          <Store className="size-4 text-emerald-700" />
        ) : (
          <Moon className="size-4 text-cocoa-500" />
        )}
      </span>
    </button>
  );
}

export function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-cocoa-900/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-pop-in max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border-2 border-cocoa-100 bg-white p-6 shadow-xl sm:max-w-lg sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-cocoa-400 hover:bg-cocoa-100 hover:text-cocoa-700" aria-label="ปิด">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export { cx };
