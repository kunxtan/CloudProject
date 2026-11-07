import { Trash2, UserMinus, UserPlus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { errorMessage } from '../../api/client.js';
import { staffApi } from '../../api/endpoints.js';
import { Button, Card, EmptyState, ErrorBox, Input, PageHeader, Spinner } from '../../components/ui.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export default function StaffManagerPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [members, setMembers] = useState(null);
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const load = () =>
    staffApi
      .members()
      .then(setMembers)
      .catch((err) => setError(errorMessage(err)));

  useEffect(() => {
    load();
  }, []);

  const onAdd = async (e) => {
    e.preventDefault();
    setError('');
    setAdding(true);
    try {
      const m = await staffApi.addMember(email.trim());
      toast.success(`เพิ่ม ${m.name} เป็นพนักงานแล้ว`);
      setEmail('');
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  const onRemove = async (m) => {
    const ok = await confirm({
      title: `นำ ${m.name} ออกจากพนักงาน?`,
      message: 'บัญชีนี้จะกลับเป็นลูกค้าธรรมดา และเข้าหน้าจัดการร้านไม่ได้อีก (เพิ่มกลับได้ภายหลัง)',
      confirmText: 'นำออก',
      tone: 'danger',
      icon: UserMinus,
    });
    if (!ok) return;
    try {
      await staffApi.removeMember(m.id);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="พนักงาน" description="พนักงานเรียกคิว จัดโต๊ะ และดูสถิติได้ แต่แก้ข้อมูลร้านไม่ได้" />

      <Card className="mb-6 p-5">
        <form onSubmit={onAdd} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label="อีเมลของพนักงาน"
              type="email"
              required
              placeholder="staff@example.com"
              hint="พนักงานต้องสมัครสมาชิก (แบบลูกค้า) ด้วยอีเมลนี้ก่อน"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" icon={UserPlus} loading={adding} className="sm:mb-6">
            เพิ่มพนักงาน
          </Button>
        </form>
        <ErrorBox>{error}</ErrorBox>
      </Card>

      {members === null ? (
        <Spinner />
      ) : members.length === 0 ? (
        <EmptyState icon={Users} title="ยังไม่มีพนักงาน" description="เพิ่มพนักงานด้วยอีเมลด้านบน" />
      ) : (
        <Card className="divide-y divide-cocoa-100">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-5 py-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700" aria-hidden>
                {m.name.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{m.name}</p>
                <p className="truncate text-sm text-cocoa-500">{m.email}</p>
              </div>
              <Button variant="ghost" size="sm" icon={Trash2} onClick={() => onRemove(m)} aria-label={`นำ ${m.name} ออก`} />
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
