import { ArrowLeft, Clock, MapPin, Minus, Plus, Ticket, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { errorCode, errorMessage } from '../../api/client.js';
import { restaurantApi } from '../../api/endpoints.js';
import { RestaurantCover, RestaurantLogo } from '../../components/RestaurantImage.jsx';
import { OpenBadge } from '../../components/StatusBadge.jsx';
import { Button, Card, EmptyState, ErrorBox, Spinner } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { requestNotificationPermission } from '../../hooks/useNotifications.js';
import { usePolling } from '../../hooks/usePolling.js';
import { durationParts } from '../../utils/format.js';

const MAX_PARTY = 20;

export default function RestaurantDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [partySize, setPartySize] = useState(2);
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState(null);

  const { data: r, error, loading } = usePolling(() => restaurantApi.get(id), 10_000, [id]);

  if (loading && !r) return <Spinner />;
  if (error && !r) {
    return (
      <EmptyState
        title="ไม่พบร้านอาหาร"
        description={errorMessage(error)}
        action={
          <Link to="/" className="text-sm font-medium text-brand-600 hover:underline">
            กลับไปหน้าค้นหา
          </Link>
        }
      />
    );
  }

  const onBook = async () => {
    setBookError(null);
    setBooking(true);
    try {
      const q = await restaurantApi.book(r.id, partySize);
      toast.success(`จองคิวสำเร็จ! คิวของคุณคือ ${q.displayNumber}`);
      await requestNotificationPermission(); // ขออนุญาตแจ้งเตือนตอนผู้ใช้เพิ่งกดปุ่ม (browser บังคับ)
      navigate('/my-queue');
    } catch (err) {
      setBookError(err);
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-cocoa-500 hover:text-cocoa-800">
        <ArrowLeft className="size-4" aria-hidden /> ร้านทั้งหมด
      </Link>

      <div className="overflow-hidden rounded-[2rem] border-2 border-cocoa-100 bg-white shadow-soft">
        <RestaurantCover restaurant={r} className="h-48 w-full sm:h-64" />
        <div className="relative px-5 pb-6 sm:px-8">
          <RestaurantLogo restaurant={r} className="-mt-10 size-20 border-4 border-white text-3xl shadow-md" />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold sm:text-3xl">{r.name}</h1>
            <OpenBadge isOpen={r.isOpen} />
          </div>
          {r.address && (
            <p className="mt-2 flex items-start gap-1.5 text-cocoa-500">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden /> {r.address}
            </p>
          )}
          {r.description && <p className="mt-4 whitespace-pre-line text-cocoa-700">{r.description}</p>}
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-5">
        <Card className="p-5 md:col-span-2">
          <p className="text-sm font-medium text-cocoa-500">สถานะคิวตอนนี้</p>
          {/* flex-col + justify-between → ตัวเลขทั้ง 2 ช่องชิดล่างเท่ากัน แม้ชื่อช่องตกบรรทัด */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="flex flex-col justify-between">
              <p className="flex items-center gap-1.5 text-sm text-cocoa-500">
                <Users className="size-4" aria-hidden /> รออยู่
              </p>
              <p className="mt-1 font-display text-3xl font-bold">
                {r.waitingCount} <span className="font-sans text-base font-normal text-cocoa-500">คิว</span>
              </p>
            </div>
            <div className="flex flex-col justify-between">
              <p className="flex items-start gap-1.5 text-sm text-cocoa-500">
                <Clock className="mt-0.5 size-4 shrink-0" aria-hidden /> เวลารอโดยประมาณ
              </p>
              {r.estWaitMin > 0 ? (
                <p className="mt-1 font-display text-3xl font-bold">
                  <span className="font-sans text-base font-normal text-cocoa-500">ราว</span>{' '}
                  {durationParts(r.estWaitMin).map(([n, unit]) => (
                    <span key={unit} className="whitespace-nowrap">
                      {n} <span className="font-sans text-base font-normal text-cocoa-500">{unit}</span>{' '}
                    </span>
                  ))}
                </p>
              ) : (
                <p className="mt-2 text-xl font-bold text-emerald-700">ไม่ต้องรอ</p>
              )}
            </div>
          </div>
          <p className="mt-4 text-xs text-cocoa-500">อัปเดตอัตโนมัติทุก 10 วินาที</p>
        </Card>

        <Card className="p-5 md:col-span-3">
          <h2 className="text-lg font-semibold">จองคิว</h2>
          {!r.isOpen ? (
            <p className="mt-3 rounded-2xl bg-cocoa-100 px-4 py-3 text-sm text-cocoa-600">ร้านปิดรับคิวอยู่ในขณะนี้</p>
          ) : !user ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-cocoa-600">เข้าสู่ระบบเพื่อจองคิวและรับการแจ้งเตือนเมื่อใกล้ถึงคิว</p>
              <Link
                to={`/login?next=${encodeURIComponent(`/restaurants/${r.id}`)}`}
                className="inline-flex h-13 w-full items-center justify-center rounded-full bg-brand-500 font-semibold text-white shadow-pop transition-all hover:bg-brand-600 active:translate-y-[3px] active:shadow-none"
              >
                เข้าสู่ระบบเพื่อจองคิว
              </Link>
            </div>
          ) : user.role !== 'customer' ? (
            <p className="mt-3 rounded-2xl bg-cocoa-100 px-4 py-3 text-sm text-cocoa-600">เฉพาะบัญชีลูกค้าเท่านั้นที่จองคิวได้</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between rounded-full border-2 border-cocoa-100 bg-cocoa-50 py-2 pr-2 pl-5">
                <span className="text-sm font-medium text-cocoa-700">จำนวนคน</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPartySize((n) => Math.max(1, n - 1))}
                    disabled={partySize <= 1}
                    className="flex size-9 items-center justify-center rounded-full border-2 border-cocoa-200 bg-white text-brand-600 hover:border-brand-300 hover:bg-brand-50 disabled:opacity-40"
                    aria-label="ลดจำนวนคน"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="w-8 text-center text-xl font-bold" aria-live="polite">
                    {partySize}
                  </span>
                  <button
                    onClick={() => setPartySize((n) => Math.min(MAX_PARTY, n + 1))}
                    disabled={partySize >= MAX_PARTY}
                    className="flex size-9 items-center justify-center rounded-full border-2 border-cocoa-200 bg-white text-brand-600 hover:border-brand-300 hover:bg-brand-50 disabled:opacity-40"
                    aria-label="เพิ่มจำนวนคน"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>

              {bookError && (
                <ErrorBox>
                  {errorMessage(bookError)}{' '}
                  {errorCode(bookError) === 'ALREADY_IN_QUEUE' && (
                    <Link to="/my-queue" className="font-medium underline">
                      ดูคิวของฉัน
                    </Link>
                  )}
                </ErrorBox>
              )}

              <Button size="lg" className="w-full" onClick={onBook} loading={booking} icon={Ticket}>
                จองคิว {partySize} ท่าน
              </Button>
              <p className="text-center text-xs text-cocoa-500">
                ระบบจะแจ้งเตือนเมื่อเหลืออีก {r.nearThreshold} คิว และเมื่อถึงคิวของคุณ
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
