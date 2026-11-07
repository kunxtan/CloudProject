import { ImageUp, Save, Store } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { errorMessage } from '../../api/client.js';
import { restaurantApi, staffApi } from '../../api/endpoints.js';
import { uploadRestaurantImage } from '../../api/upload.js';
import { RestaurantCover, RestaurantLogo } from '../../components/RestaurantImage.jsx';
import { Button, Card, ErrorBox, Input, PageHeader, Spinner, Textarea } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

// ไม่มี isOpen ในฟอร์ม — เปิด/ปิดรับคิวทำที่หน้าจัดการคิว (ร้านใหม่เปิดรับคิวเป็นค่าเริ่มต้น)
// และกันไม่ให้การกดบันทึกหน้านี้ไปเขียนทับสถานะที่เพิ่งเปลี่ยนจากหน้าจัดการคิว
const EMPTY = { name: '', description: '', address: '', avgServiceMinutes: 15, nearThreshold: 3 };

export default function RestaurantSettingsPage() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const isNew = !user.restaurantId;

  const [restaurant, setRestaurant] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isNew) return;
    staffApi
      .restaurant()
      .then((r) => {
        setRestaurant(r);
        setForm({
          name: r.name,
          description: r.description ?? '',
          address: r.address ?? '',
          avgServiceMinutes: r.avgServiceMinutes,
          nearThreshold: r.nearThreshold,
        });
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [isNew]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const body = {
      ...form,
      avgServiceMinutes: Number(form.avgServiceMinutes),
      nearThreshold: Number(form.nearThreshold),
    };
    try {
      if (isNew) {
        await restaurantApi.create(body);
        await refreshUser(); // ได้ restaurantId ใหม่
        toast.success('สร้างร้านเรียบร้อย! เพิ่มโต๊ะเพื่อเริ่มรับคิว');
        navigate('/staff/tables');
      } else {
        setRestaurant(await restaurantApi.update(restaurant.id, body));
        toast.success('บันทึกแล้ว');
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={isNew ? 'สร้างร้านอาหาร' : 'ตั้งค่าร้าน'}
        description={isNew ? 'กรอกข้อมูลร้าน แล้วลูกค้าจะค้นหาและจองคิวได้ทันที' : 'ข้อมูลที่ลูกค้าจะเห็นในหน้าร้าน'}
      />

      {!isNew && restaurant && <ImagesCard restaurant={restaurant} onChange={setRestaurant} />}

      <Card className="p-5 sm:p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="ชื่อร้าน" required maxLength={150} value={form.name} onChange={set('name')} />
          <Textarea label="รายละเอียดร้าน" maxLength={2000} value={form.description} onChange={set('description')} placeholder="เมนูเด่น เวลาเปิด-ปิด ฯลฯ" />
          <Input label="ที่อยู่ / ย่าน" maxLength={255} value={form.address} onChange={set('address')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="เวลาบริการเฉลี่ยต่อคิว (นาที)"
              type="number"
              min={1}
              max={240}
              required
              hint="ใช้คำนวณเวลารอโดยประมาณให้ลูกค้า"
              value={form.avgServiceMinutes}
              onChange={set('avgServiceMinutes')}
            />
            <Input
              label="แจ้งเตือน 'ใกล้ถึงคิว' เมื่อเหลือ (คิว)"
              type="number"
              min={0}
              max={20}
              required
              hint="0 = ไม่แจ้งเตือน"
              value={form.nearThreshold}
              onChange={set('nearThreshold')}
            />
          </div>
          <ErrorBox>{error}</ErrorBox>
          <div className="flex justify-end">
            <Button type="submit" loading={saving} icon={isNew ? Store : Save}>
              {isNew ? 'สร้างร้าน' : 'บันทึก'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function ImagesCard({ restaurant, onChange }) {
  const toast = useToast();
  const [uploading, setUploading] = useState(null);
  const coverInput = useRef(null);
  const logoInput = useRef(null);

  const onFile = (type) => async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(type);
    try {
      const key = await uploadRestaurantImage(restaurant.id, type, file);
      const updated = await restaurantApi.update(restaurant.id, type === 'cover' ? { coverImageKey: key } : { logoKey: key });
      onChange(updated);
      toast.success(type === 'cover' ? 'อัปเดตรูปหน้าร้านแล้ว' : 'อัปเดตโลโก้แล้ว');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(null);
    }
  };

  return (
    <Card className="mb-6 overflow-hidden">
      <RestaurantCover restaurant={restaurant} className="h-40 w-full" />
      {/* โลโก้ลอยทับขอบล่างรูปหน้าร้านครึ่งหนึ่ง แล้วปุ่มอยู่ข้าง ๆ */}
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3 px-5 pb-5 sm:px-6">
        <RestaurantLogo restaurant={restaurant} className="-mt-10 size-20 border-4 border-white text-3xl shadow-md" />
        <div className="flex flex-wrap gap-2">
          <input ref={coverInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFile('cover')} />
          <input ref={logoInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFile('logo')} />
          <Button size="sm" variant="secondary" icon={ImageUp} loading={uploading === 'cover'} onClick={() => coverInput.current.click()}>
            เปลี่ยนรูปหน้าร้าน
          </Button>
          <Button size="sm" variant="secondary" icon={ImageUp} loading={uploading === 'logo'} onClick={() => logoInput.current.click()}>
            เปลี่ยนโลโก้
          </Button>
        </div>
        <p className="w-full text-xs text-cocoa-500">รองรับไฟล์ JPG, PNG หรือ WEBP ขนาดไม่เกิน 5MB</p>
      </div>
    </Card>
  );
}
