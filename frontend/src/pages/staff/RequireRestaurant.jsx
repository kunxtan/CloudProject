import { Store } from 'lucide-react';
import { Link, Outlet } from 'react-router';
import { EmptyState } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

/** หน้า /staff/* (ยกเว้นตั้งค่าร้าน) ต้องสังกัดร้านก่อน */
export function RequireRestaurant() {
  const { user } = useAuth();
  if (user.restaurantId) return <Outlet />;

  if (user.role === 'owner') {
    return (
      <EmptyState
        icon={Store}
        title="ยังไม่มีร้านอาหาร"
        description="สร้างร้านของคุณก่อน แล้วเริ่มรับคิวได้ทันที"
        action={
          <Link to="/staff/settings" className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-pop transition-all hover:bg-brand-600 active:translate-y-[3px] active:shadow-none">
            สร้างร้านอาหาร
          </Link>
        }
      />
    );
  }
  return (
    <EmptyState icon={Store} title="บัญชีนี้ยังไม่ได้ผูกกับร้าน" description="ติดต่อเจ้าของร้านให้เพิ่มคุณเป็นพนักงานด้วยอีเมลที่ใช้สมัคร" />
  );
}
