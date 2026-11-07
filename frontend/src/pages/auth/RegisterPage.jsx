import { Store, User, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { errorMessage } from '../../api/client.js';
import { Button, ErrorBox, Input, cx } from '../../components/ui.jsx';
import { homePathFor, useAuth } from '../../context/AuthContext.jsx';
import { AuthShell } from './LoginPage.jsx';

const ROLES = [
  { value: 'customer', label: 'ลูกค้า', desc: 'จองคิวร้านอาหาร', icon: User },
  { value: 'owner', label: 'เจ้าของร้าน', desc: 'เปิดร้านและจัดการคิว', icon: Store },
];

export default function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'customer' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={homePathFor(user)} replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const u = await register(form);
      const next = params.get('next');
      if (u.role === 'owner') navigate('/staff/settings', { replace: true });
      else navigate(next?.startsWith('/') && !next.startsWith('//') ? next : '/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="สมัครสมาชิก" subtitle="ใช้เวลาไม่ถึงนาที">
      <form onSubmit={onSubmit} className="space-y-4">
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-cocoa-700">สมัครในฐานะ</legend>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map((r) => (
              <label
                key={r.value}
                className={cx(
                  'flex cursor-pointer flex-col items-center gap-1 rounded-3xl border-2 p-3 text-center transition-colors',
                  form.role === r.value ? 'border-brand-500 bg-brand-50' : 'border-cocoa-200 hover:border-cocoa-300',
                )}
              >
                <input type="radio" name="role" value={r.value} checked={form.role === r.value} onChange={set('role')} className="sr-only" />
                <r.icon className={cx('size-5', form.role === r.value ? 'text-brand-600' : 'text-cocoa-400')} aria-hidden />
                <span className="text-sm font-semibold">{r.label}</span>
                <span className="text-xs text-cocoa-500">{r.desc}</span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-cocoa-500">พนักงานร้าน: สมัครเป็น "ลูกค้า" แล้วให้เจ้าของร้านเพิ่มด้วยอีเมล</p>
        </fieldset>

        <Input label="ชื่อ" required maxLength={100} autoComplete="name" value={form.name} onChange={set('name')} />
        <Input label="อีเมล" type="email" required autoComplete="email" value={form.email} onChange={set('email')} />
        <Input label="เบอร์โทร" type="tel" autoComplete="tel" placeholder="08x-xxx-xxxx" value={form.phone} onChange={set('phone')} />
        <Input
          label="รหัสผ่าน"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          hint="อย่างน้อย 8 ตัวอักษร"
          value={form.password}
          onChange={set('password')}
        />
        <ErrorBox>{error}</ErrorBox>
        <Button type="submit" className="w-full" size="lg" loading={submitting} icon={UserPlus}>
          สมัครสมาชิก
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-cocoa-500">
        มีบัญชีแล้ว?{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          เข้าสู่ระบบ
        </Link>
      </p>
    </AuthShell>
  );
}
