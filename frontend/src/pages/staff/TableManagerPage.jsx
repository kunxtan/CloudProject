import { Check, Plus, Sparkles, Trash2, UserRound, Users } from 'lucide-react';
import { useState } from 'react';
import { errorMessage } from '../../api/client.js';
import { staffApi } from '../../api/endpoints.js';
import { Button, Card, EmptyState, ErrorBox, Input, PageHeader, Spinner, cx } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePolling } from '../../hooks/usePolling.js';

const STATUS = {
  available: { label: 'ว่าง', icon: Check, card: 'border-emerald-300 bg-emerald-50', text: 'text-emerald-700' },
  occupied: { label: 'มีลูกค้า', icon: UserRound, card: 'border-brand-300 bg-brand-50', text: 'text-brand-700' },
  cleaning: { label: 'รอทำความสะอาด', icon: Sparkles, card: 'border-sky-300 bg-sky-50', text: 'text-sky-700' },
};

// ปุ่มถัดไปตามสถานะปัจจุบัน
const NEXT_ACTION = {
  occupied: { to: 'cleaning', label: 'ลูกค้าออกแล้ว' },
  cleaning: { to: 'available', label: 'พร้อมใช้งาน' },
  available: { to: 'occupied', label: 'walk-in' },
};

export default function TableManagerPage() {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const isOwner = user.role === 'owner';
  const [form, setForm] = useState({ label: '', capacity: 4 });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const tables = usePolling(() => staffApi.tables(), 10_000);

  const setStatus = async (t, status) => {
    try {
      await staffApi.updateTable(t.id, { status });
      tables.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const onAdd = async (e) => {
    e.preventDefault();
    setAddError('');
    setAdding(true);
    try {
      await staffApi.createTable({ label: form.label.trim(), capacity: Number(form.capacity) });
      setForm({ label: '', capacity: form.capacity });
      tables.refresh();
    } catch (err) {
      setAddError(errorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  const onDelete = async (t) => {
    const ok = await confirm({
      title: `ลบโต๊ะ ${t.label}?`,
      message: `โต๊ะ ${t.capacity} ที่นั่งนี้จะหายไปจากผังร้าน และลบแล้วกู้คืนไม่ได้`,
      confirmText: 'ลบโต๊ะ',
      tone: 'danger',
      icon: Trash2,
    });
    if (!ok) return;
    try {
      await staffApi.deleteTable(t.id);
      tables.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const counts = Object.fromEntries(Object.keys(STATUS).map((s) => [s, tables.data?.filter((t) => t.status === s).length ?? 0]));

  return (
    <div>
      <PageHeader title="โต๊ะ" description="แตะปุ่มบนการ์ดเพื่อเปลี่ยนสถานะโต๊ะ" />

      <div className="mb-6 flex flex-wrap gap-2">
        {Object.entries(STATUS).map(([key, s]) => (
          <span key={key} className={cx('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm', s.card, s.text)}>
            <s.icon className="size-4" aria-hidden /> {s.label} {counts[key]}
          </span>
        ))}
      </div>

      {isOwner && (
        <Card className="mb-6 p-4">
          <form onSubmit={onAdd} className="flex flex-wrap items-end gap-3">
            <div className="w-32">
              <Input label="ชื่อโต๊ะ" placeholder="เช่น A5" required maxLength={20} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            </div>
            <div className="w-28">
              <Input
                label="ที่นั่ง"
                type="number"
                min={1}
                max={50}
                required
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              />
            </div>
            <Button type="submit" icon={Plus} loading={adding}>
              เพิ่มโต๊ะ
            </Button>
          </form>
          {addError && (
            <div className="mt-3">
              <ErrorBox>{addError}</ErrorBox>
            </div>
          )}
        </Card>
      )}

      {tables.loading && !tables.data ? (
        <Spinner />
      ) : tables.data?.length === 0 ? (
        <EmptyState icon={Users} title="ยังไม่มีโต๊ะ" description={isOwner ? 'เพิ่มโต๊ะด้านบนเพื่อเริ่มจัดที่นั่งให้ลูกค้า' : 'ให้เจ้าของร้านเพิ่มโต๊ะก่อน'} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {tables.data?.map((t) => {
            const s = STATUS[t.status];
            const next = NEXT_ACTION[t.status];
            return (
              <div key={t.id} className={cx('flex flex-col rounded-2xl border-2 p-4', s.card)}>
                <div className="flex items-start justify-between">
                  <span className="text-2xl font-bold">{t.label}</span>
                  {isOwner && t.status !== 'occupied' && (
                    <button onClick={() => onDelete(t)} className="text-cocoa-400 hover:text-red-600" aria-label={`ลบโต๊ะ ${t.label}`}>
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-cocoa-600">{t.capacity} ที่นั่ง</p>
                <p className={cx('mt-2 flex items-center gap-1 text-sm font-medium', s.text)}>
                  <s.icon className="size-4" aria-hidden /> {s.label}
                </p>
                {t.currentQueue && (
                  <p className="mt-1 truncate text-xs text-cocoa-600">
                    คิว {t.currentQueue.displayNumber} · {t.currentQueue.customerName}
                  </p>
                )}
                <Button size="sm" variant="secondary" className="mt-3" onClick={() => setStatus(t, next.to)}>
                  {next.label}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
