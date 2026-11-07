import { Armchair, BellRing, CircleX, Clock, Megaphone, Phone, SkipForward, Users, X } from 'lucide-react';
import { useState } from 'react';
import { errorMessage } from '../../api/client.js';
import { restaurantApi, staffApi } from '../../api/endpoints.js';
import { Button, Card, ErrorBox, Modal, OpenToggle, PageHeader, Spinner, cx } from '../../components/ui.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePolling } from '../../hooks/usePolling.js';
import { formatAgo, formatDuration, minutesSince } from '../../utils/format.js';

export default function QueueDashboardPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(null); // `${queueId}:${action}`
  const [seatFor, setSeatFor] = useState(null);

  const restaurant = usePolling(() => staffApi.restaurant(), 15_000);
  const queues = usePolling(() => staffApi.queues('waiting,called'), 5000);

  const waiting = queues.data?.filter((q) => q.status === 'waiting') ?? [];
  const called = queues.data?.filter((q) => q.status === 'called') ?? [];

  const act = async (q, action, body, successMsg) => {
    setBusy(`${q.id}:${action}`);
    try {
      await staffApi.action(q.id, action, body);
      if (successMsg) toast.success(successMsg);
      await queues.refresh();
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      await queues.refresh();
      return false;
    } finally {
      setBusy(null);
    }
  };

  const CONFIRM = {
    skip: { verb: 'ข้าม', icon: SkipForward, tone: 'primary', note: 'ใช้เมื่อลูกค้าไม่มาแสดงตัว ลูกค้าจะเห็นสถานะ "ข้ามคิว"' },
    cancel: { verb: 'ยกเลิก', icon: CircleX, tone: 'danger', note: 'ลูกค้าจะเห็นสถานะ "ยกเลิก" และต้องจองใหม่ถ้าจะมาอีก' },
  };
  const confirmAct = async (q, action) => {
    const c = CONFIRM[action];
    const ok = await confirm({
      title: `${c.verb}คิว ${q.displayNumber}?`,
      message: `${q.customerName} · ${q.partySize} ท่าน\n${c.note}`,
      confirmText: `${c.verb}คิว`,
      cancelText: 'ไม่ใช่ตอนนี้',
      tone: c.tone,
      icon: c.icon,
    });
    if (ok) act(q, action, {}, `${c.verb}คิว ${q.displayNumber} แล้ว`);
  };

  const [toggling, setToggling] = useState(false);
  const toggleOpen = async (isOpen) => {
    setToggling(true);
    try {
      await restaurantApi.update(restaurant.data.id, { isOpen });
      await restaurant.refresh();
      toast.info(isOpen ? 'เปิดรับคิวแล้ว' : 'ปิดรับคิวแล้ว — ลูกค้าใหม่จะจองไม่ได้');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setToggling(false);
    }
  };

  if (restaurant.loading && !restaurant.data) return <Spinner />;
  if (restaurant.error && !restaurant.data) return <ErrorBox>{errorMessage(restaurant.error)}</ErrorBox>;
  const r = restaurant.data;

  return (
    <div>
      <PageHeader
        title={r.name}
        description="จัดการคิววันนี้ · อัปเดตอัตโนมัติทุก 5 วินาที"
        inlineActions
        actions={<OpenToggle isOpen={r.isOpen} onChange={toggleOpen} busy={toggling} />}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="รอคิว" value={waiting.length} icon={Users} />
        <StatTile label="เรียกแล้ว รอเข้าร้าน" value={called.length} icon={BellRing} />
        <div className="col-span-2 sm:col-span-1">
          <Button
            size="lg"
            className="h-full min-h-16 w-full rounded-3xl! text-lg"
            icon={Megaphone}
            disabled={!waiting.length}
            loading={busy === `${waiting[0]?.id}:call`}
            onClick={() => act(waiting[0], 'call', {}, `เรียกคิว ${waiting[0].displayNumber} แล้ว`)}
          >
            {waiting.length ? `เรียกคิวถัดไป (${waiting[0].displayNumber})` : 'ไม่มีคิวรอ'}
          </Button>
        </div>
      </div>

      {queues.loading && !queues.data ? (
        <Spinner />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section>
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <BellRing className="size-4 text-brand-500" aria-hidden /> เรียกแล้ว ({called.length})
            </h2>
            {called.length === 0 ? (
              <EmptyColumn text="ยังไม่มีคิวที่ถูกเรียก" />
            ) : (
              <div className="space-y-3">
                {called.map((q) => (
                  <QueueRow key={q.id} q={q} highlight>
                    <Button size="sm" variant="success" icon={Armchair} onClick={() => setSeatFor(q)}>
                      จัดโต๊ะ
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={SkipForward}
                      loading={busy === `${q.id}:skip`}
                      onClick={() => confirmAct(q, 'skip')}
                    >
                      ข้าม
                    </Button>
                  </QueueRow>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <Clock className="size-4 text-sky-600" aria-hidden /> รอคิว ({waiting.length})
            </h2>
            {waiting.length === 0 ? (
              <EmptyColumn text="ไม่มีลูกค้ารอคิว" />
            ) : (
              <div className="space-y-3">
                {waiting.map((q) => (
                  <QueueRow key={q.id} q={q}>
                    <Button
                      size="sm"
                      icon={Megaphone}
                      loading={busy === `${q.id}:call`}
                      onClick={() => act(q, 'call', {}, `เรียกคิว ${q.displayNumber} แล้ว`)}
                    >
                      เรียก
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      icon={X}
                      loading={busy === `${q.id}:cancel`}
                      onClick={() => confirmAct(q, 'cancel')}
                      aria-label={`ยกเลิกคิว ${q.displayNumber}`}
                    />
                  </QueueRow>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <SeatModal
        queue={seatFor}
        onClose={() => setSeatFor(null)}
        onSeat={async (table) => {
          const ok = await act(seatFor, 'seat', { tableId: table.id }, `คิว ${seatFor.displayNumber} นั่งโต๊ะ ${table.label} แล้ว`);
          if (ok) setSeatFor(null);
        }}
        busy={busy === `${seatFor?.id}:seat`}
      />
    </div>
  );
}

function StatTile({ label, value, icon: Icon }) {
  return (
    // flex-col + justify-between → ตัวเลขชิดล่างเท่ากันทุกการ์ด แม้ชื่อการ์ดบางอันตกเป็น 2 บรรทัด
    <Card className="flex h-full flex-col justify-between gap-1 p-4">
      <p className="flex items-start gap-1.5 text-sm text-cocoa-500">
        <Icon className="mt-0.5 size-4 shrink-0" aria-hidden /> {label}
      </p>
      <p className="mt-1 font-display text-4xl font-semibold tabular-nums">{value}</p>
    </Card>
  );
}

function EmptyColumn({ text }) {
  return <p className="rounded-3xl border-2 border-dashed border-cocoa-200 bg-white/80 p-6 text-center text-sm text-cocoa-500">{text}</p>;
}

function QueueRow({ q, highlight, children }) {
  const waited = minutesSince(q.createdAt);
  return (
    // มือถือ: แถวบน = เลขคิว + ข้อมูล, แถวล่าง = ปุ่ม (ปุ่มหลักยืดเต็ม กดง่าย) / จอ sm ขึ้นไป: แถวเดียว
    <Card className={cx('flex flex-wrap items-center gap-x-4 gap-y-3 p-4', highlight && 'border-brand-300 bg-brand-50/40')}>
      <span
        className={cx(
          'w-14 text-center font-display text-2xl font-bold tabular-nums sm:w-16 sm:text-3xl',
          highlight ? 'text-brand-600' : 'text-cocoa-800',
        )}
      >
        {q.displayNumber}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{q.customerName}</p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-cocoa-500">
          <span className="flex items-center gap-1">
            <Users className="size-3.5" aria-hidden /> {q.partySize} ท่าน
          </span>
          {q.customerPhone && (
            <a href={`tel:${q.customerPhone}`} className="flex items-center gap-1 hover:text-brand-600">
              <Phone className="size-3.5" aria-hidden /> {q.customerPhone}
            </a>
          )}
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden />
            {highlight ? `เรียกเมื่อ ${formatAgo(minutesSince(q.calledAt))}` : `รอมา ${formatDuration(waited)}`}
          </span>
        </p>
      </div>
      <div className="flex shrink-0 gap-2 max-sm:w-full max-sm:[&>:first-child]:flex-1">{children}</div>
    </Card>
  );
}

function SeatModal({ queue, onClose, onSeat, busy }) {
  const tables = usePolling(() => staffApi.tables(), 10_000, [queue?.id], { enabled: Boolean(queue) });
  if (!queue) return null;

  const sorted = [...(tables.data ?? [])].sort((a, b) => a.capacity - b.capacity || a.label.localeCompare(b.label));

  return (
    <Modal open onClose={onClose} title={`เลือกโต๊ะให้คิว ${queue.displayNumber} (${queue.partySize} ท่าน)`}>
      {tables.loading && !tables.data ? (
        <Spinner />
      ) : sorted.length === 0 ? (
        <p className="text-sm text-cocoa-500">ยังไม่มีโต๊ะ — เพิ่มโต๊ะที่หน้า "โต๊ะ" ก่อน</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {sorted.map((t) => {
            const fits = t.capacity >= queue.partySize;
            const available = t.status === 'available';
            const disabled = !fits || !available || busy;
            return (
              <button
                key={t.id}
                disabled={disabled}
                onClick={() => onSeat(t)}
                className={cx(
                  'flex flex-col items-center rounded-3xl border-2 p-3 text-center transition',
                  disabled ? 'border-cocoa-200 bg-cocoa-50 opacity-50' : 'border-emerald-300 bg-emerald-50 hover:border-emerald-500',
                )}
              >
                <span className="text-lg font-bold">{t.label}</span>
                <span className="text-xs text-cocoa-600">{t.capacity} ที่นั่ง</span>
                <span className="mt-1 text-[11px] text-cocoa-500">
                  {!available ? (t.status === 'occupied' ? 'มีลูกค้า' : 'รอทำความสะอาด') : !fits ? 'ที่นั่งไม่พอ' : 'ว่าง'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
