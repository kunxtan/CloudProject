import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

const STYLES = {
  success: { icon: CheckCircle2, ring: 'border-emerald-200', iconColor: 'text-emerald-600' },
  error: { icon: TriangleAlert, ring: 'border-red-200', iconColor: 'text-red-600' },
  info: { icon: Info, ring: 'border-brand-200', iconColor: 'text-brand-600' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (message, type = 'info', { duration = 4000 } = {}) => {
      const id = nextId.current++;
      setToasts((t) => [...t.slice(-3), { id, message, type }]);
      if (duration) setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      push,
      success: (m, o) => push(m, 'success', o),
      error: (m, o) => push(m, 'error', o),
      info: (m, o) => push(m, 'info', o),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-auto sm:top-20 sm:right-4 sm:left-auto sm:items-end"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const s = STYLES[t.type] ?? STYLES.info;
          const Icon = s.icon;
          return (
            <div
              key={t.id}
              role="status"
              className={`animate-pop-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-3xl border-2 bg-white p-4 shadow-lg ${s.ring}`}
            >
              <Icon className={`mt-0.5 size-5 shrink-0 ${s.iconColor}`} aria-hidden />
              <p className="flex-1 text-sm text-cocoa-800">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="text-cocoa-400 hover:text-cocoa-700" aria-label="ปิด">
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
