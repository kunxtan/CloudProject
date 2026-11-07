import { LogIn } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { errorMessage } from '../../api/client.js';
import { Pearls } from '../../components/Mascot.jsx';
import { Logo } from '../../components/Layout.jsx';
import { Button, Card, ErrorBox, Input } from '../../components/ui.jsx';
import { homePathFor, useAuth } from '../../context/AuthContext.jsx';

const DEMO_ACCOUNTS = [
  { label: 'ลูกค้า', email: 'customer@hiwlaewq.dev' },
  { label: 'เจ้าของร้าน (ชาบู)', email: 'owner2@hiwlaewq.dev' },
  { label: 'พนักงาน (ชาบู)', email: 'staff@hiwlaewq.dev' },
];

/** อนุญาตเฉพาะ path ภายในเว็บ (กัน open redirect) */
const safeNext = (next) => (next && next.startsWith('/') && !next.startsWith('//') ? next : null);

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={next ?? homePathFor(user)} replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const u = await login(form);
      navigate(next ?? homePathFor(u), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="เข้าสู่ระบบ" subtitle="จองคิวร้านโปรด ไม่ต้องยืนรอหน้าร้าน">
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="อีเมล"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Input
          label="รหัสผ่าน"
          type="password"
          autoComplete="current-password"
          required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <ErrorBox>{error}</ErrorBox>
        <Button type="submit" className="w-full" size="lg" loading={submitting} icon={LogIn}>
          เข้าสู่ระบบ
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-cocoa-500">
        ยังไม่มีบัญชี?{' '}
        <Link to={`/register${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-medium text-brand-600 hover:underline">
          สมัครสมาชิก
        </Link>
      </p>

      {import.meta.env.DEV && (
        <div className="mt-6 rounded-3xl bg-cocoa-50 p-4 text-xs text-cocoa-600">
          <p className="mb-2 font-medium">บัญชีทดลอง (จาก npm run seed) — รหัสผ่าน password123</p>
          <div className="flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => setForm({ email: a.email, password: 'password123' })}
                className="rounded-full border-2 border-cocoa-200 bg-white px-3 py-1 font-semibold hover:border-brand-300 hover:text-brand-700"
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-linear-to-br from-brand-50 via-cocoa-50 to-brand-100 px-4 py-10">
      <Pearls layout="corner" />
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <Card className="p-6 sm:p-8">
          <h1 className="text-3xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1 mb-6 text-sm text-cocoa-500">{subtitle}</p>}
          {children}
        </Card>
      </div>
    </div>
  );
}
