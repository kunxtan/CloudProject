import { Camera, History, Loader2, LogOut, Mail, Pencil, Phone, Store, Trash2, Users } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { errorMessage } from '../../api/client.js';
import { queueApi } from '../../api/endpoints.js';
import { ALLOWED_IMAGE_TYPES, uploadAvatar } from '../../api/upload.js';
import { Avatar } from '../../components/Avatar.jsx';
import { Mascot } from '../../components/Mascot.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { ROLE_LABEL } from '../../components/UserMenu.jsx';
import { Button, Card, EmptyState, ErrorBox, Input, Modal, Spinner, cx } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePolling } from '../../hooks/usePolling.js';
import { formatDateTime, formatLongDate } from '../../utils/format.js';

export default function ProfilePage() {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);

  const onPickAvatar = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // เลือกไฟล์เดิมซ้ำได้
    if (!file) return;
    setUploading(true);
    try {
      const key = await uploadAvatar(file);
      await updateProfile({ avatarKey: key });
      toast.success('เปลี่ยนรูปโปรไฟล์แล้ว');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* การ์ดหัวโปรไฟล์ */}
      <Card className="relative overflow-hidden">
        <div className="relative h-28 bg-linear-to-br from-brand-100 via-brand-200 to-brand-300" aria-hidden>
          <span className="pearl absolute right-[12%] bottom-4 size-6" />
          <span className="pearl absolute right-[20%] bottom-9 size-4" />
          <span className="pearl absolute right-[7%] bottom-12 size-3" />
          <span className="pearl absolute bottom-6 left-[38%] hidden size-3 sm:block" />
        </div>

        {/* รูปโปรไฟล์ลอยทับขอบแถบสี ส่วนชื่อเริ่มใต้แถบสี (ไม่เบียดขอบ) */}
        <div className="flex flex-col gap-3 px-5 pb-6 sm:flex-row sm:items-start sm:gap-5 sm:px-7">
          <div className="relative -mt-14 self-center sm:self-auto">
            <Avatar user={user} className="size-28 border-4 border-white text-5xl shadow-soft" />
            {uploading && (
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-cocoa-900/40">
                <Loader2 className="size-7 animate-spin text-white" aria-label="กำลังอัปโหลด" />
              </span>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute right-0 bottom-1 flex size-9 items-center justify-center rounded-full border-2 border-white bg-brand-500 text-white shadow-pop transition hover:bg-brand-600 active:translate-y-0.5 active:shadow-none disabled:opacity-60"
              aria-label="เปลี่ยนรูปโปรไฟล์"
              title="เปลี่ยนรูปโปรไฟล์"
            >
              <Camera className="size-4" aria-hidden />
            </button>
            <input ref={fileRef} type="file" accept={ALLOWED_IMAGE_TYPES.join(',')} className="hidden" onChange={onPickAvatar} />
          </div>

          <div className="min-w-0 flex-1 text-center sm:pt-4 sm:text-left">
            <h1 className="truncate text-2xl font-bold text-cocoa-900 sm:text-3xl">{user.name}</h1>
            <p className="mt-1.5 flex flex-wrap items-center justify-center gap-2 text-sm text-cocoa-500 sm:justify-start">
              <span className="rounded-full bg-brand-100 px-3 py-0.5 text-xs font-semibold text-brand-700">
                {ROLE_LABEL[user.role]}
              </span>
              สมาชิกตั้งแต่ {formatLongDate(user.createdAt)}
            </p>
          </div>

          <Button variant="secondary" size="sm" icon={Pencil} onClick={() => setEditing(true)} className="self-center sm:mt-5 sm:self-start">
            แก้ไขโปรไฟล์
          </Button>
        </div>
      </Card>

      {/* ข้อมูลส่วนตัว */}
      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-bold">ข้อมูลส่วนตัว</h2>
        <dl className="space-y-3">
          <InfoRow icon={Mail} label="อีเมล" value={user.email} />
          <InfoRow icon={Phone} label="เบอร์โทร" value={user.phone || <span className="text-cocoa-500">ยังไม่ได้ระบุ</span>} />
          {user.role !== 'customer' && (
            <InfoRow
              icon={Store}
              label="ร้านที่สังกัด"
              value={
                user.restaurantId ? (
                  <Link to="/staff" className="text-brand-600 hover:underline">
                    ไปที่หน้าจัดการร้าน
                  </Link>
                ) : (
                  <span className="text-cocoa-500">ยังไม่ได้ผูกกับร้าน</span>
                )
              }
            />
          )}
        </dl>
      </Card>

      {user.role === 'customer' && <BookingHistory />}

      <Button variant="danger" icon={LogOut} onClick={onLogout} className="w-full">
        ออกจากระบบ
      </Button>

      <EditProfileModal open={editing} onClose={() => setEditing(false)} />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-cocoa-100 text-cocoa-600">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-cocoa-500">{label}</dt>
        <dd className="truncate font-semibold text-cocoa-900">{value}</dd>
      </div>
    </div>
  );
}

/* ─────────────── ประวัติการจองคิว ─────────────── */

const FILTERS = [
  { key: 'all', label: 'ทั้งหมด', match: () => true },
  { key: 'active', label: 'กำลังรอ', match: (s) => s === 'waiting' || s === 'called' },
  { key: 'seated', label: 'ได้โต๊ะ', match: (s) => s === 'seated' },
  { key: 'cancelled', label: 'ยกเลิก', match: (s) => s === 'cancelled' },
  { key: 'skipped', label: 'ข้ามคิว', match: (s) => s === 'skipped' },
];

const PAGE_STEP = 8; // แสดงทีละ 8 รายการ กดดูเพิ่มได้

function BookingHistory() {
  const history = usePolling(() => queueApi.history(), 30_000);
  const [filter, setFilter] = useState('all');
  const [limit, setLimit] = useState(PAGE_STEP);
  const all = history.data ?? [];
  const matched = all.filter((q) => FILTERS.find((f) => f.key === filter).match(q.status));
  const shown = matched.slice(0, limit);
  const remaining = matched.length - shown.length;

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <History className="size-5 text-brand-500" aria-hidden /> ประวัติการจองคิว
        </h2>
        {all.length > 0 && <p className="text-xs text-cocoa-500">{all.length} รายการล่าสุด</p>}
      </div>

      {all.length > 0 && (
        <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="กรองตามสถานะ">
          {FILTERS.map((f) => {
            const count = all.filter((q) => f.match(q.status)).length;
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setFilter(f.key);
                  setLimit(PAGE_STEP);
                }}
                className={cx(
                  'flex shrink-0 items-center gap-1.5 rounded-full border-2 px-3.5 py-1 text-sm font-semibold transition-colors',
                  active ? 'border-brand-500 bg-brand-500 text-white' : 'border-cocoa-200 bg-white text-cocoa-600 hover:border-brand-200',
                )}
              >
                {f.label}
                <span className={cx('rounded-full px-1.5 text-xs', active ? 'bg-white/25' : 'bg-cocoa-100')}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {history.error && !history.data && <ErrorBox>{errorMessage(history.error)}</ErrorBox>}
      {history.loading && !history.data ? (
        <Spinner />
      ) : shown.length === 0 ? (
        <EmptyState
          illustration={<Mascot mood="sleepy" className="size-20" />}
          title={all.length === 0 ? 'ยังไม่เคยจองคิว' : 'ไม่มีรายการในหมวดนี้'}
          description={all.length === 0 ? 'จองคิวร้านแรกของคุณได้เลย' : undefined}
          action={
            all.length === 0 && (
              <Link to="/" className="text-sm font-semibold text-brand-600 hover:underline">
                ค้นหาร้านอาหาร
              </Link>
            )
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {shown.map((q) => (
            <li key={q.id} className="flex items-center gap-3 rounded-2xl border-2 border-cocoa-100 p-3 transition-colors hover:border-brand-200">
              <span className="flex size-13 shrink-0 items-center justify-center rounded-2xl bg-brand-50 font-display text-lg font-bold text-brand-700 tabular-nums">
                {q.displayNumber}
              </span>
              <div className="min-w-0 flex-1">
                <Link to={`/restaurants/${q.restaurantId}`} className="block truncate font-semibold hover:text-brand-600">
                  {q.restaurantName}
                </Link>
                <p className="flex flex-wrap items-center gap-x-2 text-xs text-cocoa-500">
                  {formatDateTime(q.createdAt)}
                  <span className="flex items-center gap-1">
                    <Users className="size-3.5" aria-hidden /> {q.partySize} ท่าน
                  </span>
                </p>
              </div>
              <StatusBadge status={q.status} />
            </li>
          ))}
        </ul>
      )}

      {remaining > 0 && (
        <div className="mt-4 text-center">
          <Button variant="secondary" size="sm" onClick={() => setLimit((n) => n + PAGE_STEP)}>
            ดูเพิ่มเติม ({remaining} รายการ)
          </Button>
        </div>
      )}
    </Card>
  );
}

/* ─────────────── แก้ไขโปรไฟล์ ─────────────── */

function EditProfileModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="แก้ไขโปรไฟล์">
      {/* mount ใหม่ทุกครั้งที่เปิด → ฟอร์มเริ่มจากค่าปัจจุบันเสมอ */}
      {open && <EditProfileForm onDone={onClose} />}
    </Modal>
  );
}

function EditProfileForm({ onDone }) {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: user.name, phone: user.phone ?? '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async (patch, message) => {
    setSaving(true);
    setError('');
    try {
      await updateProfile(patch);
      toast.success(message);
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        save({ name: form.name, phone: form.phone }, 'บันทึกโปรไฟล์แล้ว');
      }}
    >
      <Input label="ชื่อที่แสดง" required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <Input
        label="เบอร์โทร"
        type="tel"
        inputMode="tel"
        placeholder="08x-xxx-xxxx"
        hint="ร้านใช้ติดต่อเมื่อถึงคิว (เว้นว่างได้)"
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
      />
      <ErrorBox>{error}</ErrorBox>
      <div className={cx('flex flex-col-reverse gap-2 sm:flex-row', user.avatarUrl ? 'sm:justify-between' : 'sm:justify-end')}>
        {user.avatarUrl && (
          <Button type="button" variant="ghost" size="sm" icon={Trash2} disabled={saving} onClick={() => save({ avatarKey: null }, 'ลบรูปโปรไฟล์แล้ว')}>
            ลบรูปโปรไฟล์
          </Button>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onDone} disabled={saving} className="flex-1 sm:flex-none">
            ยกเลิก
          </Button>
          <Button type="submit" loading={saving} className="flex-1 sm:flex-none">
            บันทึก
          </Button>
        </div>
      </div>
    </form>
  );
}
