import { useCallback, useEffect, useRef } from 'react';
import { notificationApi } from '../api/endpoints.js';
import { useToast } from '../context/ToastContext.jsx';
import { usePolling } from './usePolling.js';

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window;

export async function requestNotificationPermission() {
  if (!notificationsSupported()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

function showBrowserNotification(n) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  try {
    new Notification(n.type === 'ready' ? 'ถึงคิวของคุณแล้ว! 🎉' : 'ใกล้ถึงคิวแล้ว ⏰', {
      body: n.message,
      tag: `hiwlaewq-${n.id}`,
      icon: '/favicon.svg',
    });
  } catch {
    /* บาง browser (เช่น Android Chrome) ต้องใช้ Service Worker — ยังมี toast ในหน้าอยู่ */
  }
}

/**
 * poll การแจ้งเตือนที่ยังไม่อ่านทุก 5 วินาที
 * รายการใหม่ (ที่ไม่เคยเห็น) → แสดง toast + Browser Notification
 */
export function useNotifications(enabled) {
  const toast = useToast();
  const seen = useRef(null);

  const { data, refresh } = usePolling(() => notificationApi.unread(), 5000, [], { enabled });

  useEffect(() => {
    if (!enabled) seen.current = null;
  }, [enabled]);

  useEffect(() => {
    if (!data) return;
    // รอบแรกหลังเปิดหน้า: จำไว้เฉยๆ ไม่เด้งซ้ำของเก่า
    if (seen.current === null) {
      seen.current = new Set(data.map((n) => n.id));
      return;
    }
    // ถ้าคิวไหนถึงคิวแล้ว ไม่ต้องเด้ง "ใกล้ถึงคิว" ของคิวนั้นซ้ำอีก
    const readyQueues = new Set(data.filter((n) => n.type === 'ready').map((n) => n.queueId));
    for (const n of [...data].reverse()) {
      if (seen.current.has(n.id)) continue;
      seen.current.add(n.id);
      if (n.type === 'near' && readyQueues.has(n.queueId)) continue;
      toast.push(n.message, n.type === 'ready' ? 'success' : 'info', { duration: n.type === 'ready' ? 15000 : 7000 });
      showBrowserNotification(n);
      if (n.type === 'ready') navigator.vibrate?.([200, 100, 200]);
    }
  }, [data, toast]);

  const markRead = useCallback(
    async (id) => {
      await notificationApi.markRead(id);
      refresh();
    },
    [refresh],
  );

  const markAllRead = useCallback(async () => {
    await notificationApi.markAllRead();
    refresh();
  }, [refresh]);

  return { notifications: data ?? [], markRead, markAllRead };
}
