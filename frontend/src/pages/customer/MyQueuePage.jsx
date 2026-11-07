import { BellRing, BellOff, Clock, History, Search, TicketX, Users, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { errorMessage } from '../../api/client.js';
import { queueApi } from '../../api/endpoints.js';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { Mascot } from '../../components/Mascot.jsx';
import { Button, Card, EmptyState, ErrorBox, PageHeader, Spinner } from '../../components/ui.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { notificationsSupported, requestNotificationPermission } from '../../hooks/useNotifications.js';
import { usePolling } from '../../hooks/usePolling.js';
import { formatTime, formatWait } from '../../utils/format.js';

export default function MyQueuePage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [cancelling, setCancelling] = useState(null);
  const [permission, setPermission] = useState(() => (notificationsSupported() ? Notification.permission : 'unsupported'));

  const active = usePolling(() => queueApi.mine(), 5000);

  const onCancel = async (q) => {
    const ok = await confirm({
      title: `ยกเลิกคิว ${q.displayNumber}?`,
      message: `ร้าน${q.restaurantName}\nถ้ายกเลิกแล้วต้องจองใหม่ และจะต่อท้ายคิวล่าสุด`,
      confirmText: 'ยกเลิกคิว',
      cancelText: 'เก็บคิวไว้',
      tone: 'danger',
      icon: TicketX,
    });
    if (!ok) return;
    setCancelling(q.id);
    try {
      await queueApi.cancel(q.id);
      toast.info('ยกเลิกคิวแล้ว');
      active.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setCancelling(null);
    }
  };

  const enableNotifications = async () => setPermission(await requestNotificationPermission());

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="คิวของฉัน" description="สถานะอัปเดตอัตโนมัติทุก 5 วินาที" />

      {permission === 'default' && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 sm:flex-row sm:items-center">
          <BellRing className="size-6 shrink-0 text-brand-600" aria-hidden />
          <p className="flex-1 text-sm text-brand-900">เปิดการแจ้งเตือน เพื่อให้ระบบเตือนเมื่อใกล้ถึงคิว แม้จะสลับไปแอปอื่น</p>
          <Button size="sm" onClick={enableNotifications}>
            เปิดการแจ้งเตือน
          </Button>
        </div>
      )}
      {permission === 'denied' && (
        <p className="mb-6 flex items-center gap-2 text-xs text-cocoa-500">
          <BellOff className="size-4" aria-hidden /> การแจ้งเตือนของเบราว์เซอร์ถูกปิดอยู่ — คุณยังเห็นการแจ้งเตือนในหน้านี้ได้
        </p>
      )}

      {active.error && !active.data && <ErrorBox>{errorMessage(active.error)}</ErrorBox>}
      {active.loading && !active.data ? (
        <Spinner />
      ) : active.data?.length === 0 ? (
        <EmptyState
          illustration={<Mascot className="animate-float size-24" />}
          title="ยังไม่มีคิวที่รออยู่"
          description="ค้นหาร้านที่อยากกิน แล้วจองคิวได้เลย"
          action={
            <Link to="/" className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-pop transition-all hover:bg-brand-600 active:translate-y-[3px] active:shadow-none">
              <Search className="size-4" aria-hidden /> ค้นหาร้าน
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {active.data?.map((q) => (
            <ActiveQueueCard key={q.id} queue={q} onCancel={() => onCancel(q)} cancelling={cancelling === q.id} />
          ))}
        </div>
      )}

      <Link
        to="/profile"
        className="mt-8 flex items-center justify-center gap-2 rounded-full py-2 text-sm font-semibold text-brand-600 hover:bg-brand-50"
      >
        <History className="size-4" aria-hidden /> ดูประวัติการจองทั้งหมดในโปรไฟล์
      </Link>
    </div>
  );
}

function ActiveQueueCard({ queue: q, onCancel, cancelling }) {
  const called = q.status === 'called';
  return (
    <Card className={called ? 'overflow-hidden border-brand-400 ring-4 ring-brand-100' : 'overflow-hidden'}>
      {called && (
        <div className="flex items-center justify-center gap-2 bg-brand-500 px-4 py-3 font-semibold text-white" role="alert">
          <BellRing className="size-5 animate-bounce" aria-hidden />
          ถึงคิวของคุณแล้ว! กรุณาแสดงตัวที่หน้าร้าน
        </div>
      )}
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
        <div className="text-center sm:w-36">
          <p className="text-xs font-semibold text-cocoa-500">หมายเลขคิว</p>
          <p className={`font-display text-6xl font-bold tabular-nums ${called ? 'text-brand-600' : 'text-cocoa-900'}`}>{q.displayNumber}</p>
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/restaurants/${q.restaurantId}`} className="text-lg font-semibold hover:text-brand-600">
              {q.restaurantName}
            </Link>
            <StatusBadge status={q.status} />
          </div>
          <p className="flex items-center gap-1.5 text-sm text-cocoa-500">
            <Users className="size-4" aria-hidden /> {q.partySize} ท่าน · จองเมื่อ {formatTime(q.createdAt)}
          </p>
          {q.status === 'waiting' && (
            <div className="flex flex-wrap gap-x-6 gap-y-1 pt-1">
              <p className="text-sm">
                {q.ahead === 0 ? (
                  <strong className="text-brand-600">คุณเป็นคิวถัดไป!</strong>
                ) : (
                  <>
                    รออีก <strong className="text-2xl">{q.ahead}</strong> คิว
                  </>
                )}
              </p>
              <p className="flex items-center gap-1.5 text-sm text-cocoa-600">
                <Clock className="size-4" aria-hidden /> {formatWait(q.estWaitMin)}
              </p>
            </div>
          )}
        </div>

        <Button variant="danger" size="sm" icon={X} onClick={onCancel} loading={cancelling} className="self-start sm:self-center">
          ยกเลิกคิว
        </Button>
      </div>
    </Card>
  );
}
