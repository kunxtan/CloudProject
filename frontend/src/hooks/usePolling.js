import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * เรียก fetcher ซ้ำทุก intervalMs (แทน WebSocket — stateless ใช้กับหลาย instance หลัง ALB ได้ทันที)
 * - ใช้ setTimeout ต่อกัน (ไม่ใช่ setInterval) → request ไม่ซ้อนกันถ้าเน็ตช้า
 * - หยุด poll เมื่อแท็บถูกซ่อน และดึงทันทีเมื่อกลับมา → ลดโหลด server
 */
export function usePolling(fetcher, intervalMs = 5000, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: enabled });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const generation = useRef(0);

  const run = useCallback(async () => {
    const gen = generation.current;
    try {
      const data = await fetcherRef.current();
      if (gen === generation.current) setState({ data, error: null, loading: false });
    } catch (error) {
      if (gen === generation.current) setState((s) => ({ ...s, error, loading: false }));
    }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    generation.current += 1; // deps เปลี่ยน → ทิ้งผลของ request รอบเก่า
    setState((s) => ({ ...s, loading: true }));

    let timer;
    let stopped = false;
    const tick = async () => {
      if (!document.hidden) await run();
      if (!stopped) timer = setTimeout(tick, intervalMs);
    };
    tick();

    const onVisible = () => {
      if (!document.hidden) run();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, intervalMs, run, ...deps]);

  return { ...state, refresh: run };
}
