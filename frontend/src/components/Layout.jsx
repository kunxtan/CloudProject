import { BarChart3, LayoutGrid, ListOrdered, Search, Settings, Ticket, Users } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotifications } from '../hooks/useNotifications.js';
import { Mascot } from './Mascot.jsx';
import { MobileNav } from './MobileNav.jsx';
import { NotificationBell } from './NotificationBell.jsx';
import { UserMenu } from './UserMenu.jsx';
import { cx } from './ui.jsx';

function navItemsFor(role) {
  if (role === 'owner' || role === 'staff') {
    return [
      { to: '/staff', label: 'จัดการคิว', icon: ListOrdered, end: true },
      { to: '/staff/tables', label: 'โต๊ะ', icon: LayoutGrid },
      { to: '/staff/stats', label: 'สถิติ', icon: BarChart3 },
      ...(role === 'owner'
        ? [
            { to: '/staff/settings', label: 'ตั้งค่าร้าน', icon: Settings },
            { to: '/staff/members', label: 'พนักงาน', icon: Users },
          ]
        : []),
    ];
  }
  return [
    { to: '/', label: 'ค้นหาร้าน', icon: Search, end: true },
    ...(role === 'customer' ? [{ to: '/my-queue', label: 'คิวของฉัน', icon: Ticket }] : []),
  ];
}

/** compact = จอแคบ (< 420px) แสดงแค่ไอคอนชาม ซ่อนตัวหนังสือ — ใช้ตอน header มีปุ่มเลือกหน้าด้วย */
export function Logo({ compact = false }) {
  return (
    <Link to="/" className="group flex items-center gap-1.5 text-cocoa-900">
      <Mascot simple className="size-9 group-hover:animate-wiggle sm:size-11" />
      <span className={cx('font-display text-xl font-semibold tracking-tight max-[359px]:sr-only sm:text-2xl', compact && 'max-[419px]:sr-only')}>
        hiwlaew<span className="text-brand-500">Q</span>
      </span>
    </Link>
  );
}

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
 const { notifications, unreadCount, markRead, markAllRead } = useNotifications(user?.role === 'customer');
  const items = navItemsFor(user?.role);
  const headerRef = useRef(null);

  // ให้ของที่ sticky ในหน้า (เช่นแถบค้นหา) รู้ว่าต้องติดต่ำกว่า header เท่าไร
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => {
      document.documentElement.style.setProperty('--header-h', `${el.offsetHeight}px`);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header ref={headerRef} className="sticky top-0 z-20 border-b-2 border-cocoa-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-18 max-w-7xl items-center gap-2 px-4 sm:px-6 lg:px-8 sm:gap-4">
          <Logo compact={items.length > 1} />

          {/* มือถือ/แท็บเล็ต: ปุ่มเดียวเลือกหน้า */}
          <MobileNav items={items} className="ml-1 md:hidden" />

          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="เมนูหลัก">
            {items.map((it) => (
              <NavItem key={it.to} {...it} />
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            {user ? (
              <>
                {user.role === 'customer' && (
                 <NotificationBell notifications={notifications} unreadCount={unreadCount} onRead={markRead} onReadAll={markAllRead} />
                )}
                <UserMenu user={user} onLogout={onLogout} />
              </>
            ) : (
              <>
                <Link to="/login" className="rounded-full px-3 py-2 text-sm font-semibold whitespace-nowrap text-cocoa-700 hover:bg-brand-50 sm:px-4">
                  เข้าสู่ระบบ
                </Link>
                <Link
                  to="/register"
                  className="rounded-full bg-brand-500 px-3 py-2 text-sm font-semibold whitespace-nowrap text-white sm:px-4 shadow-pop transition-all hover:bg-brand-600 active:translate-y-[3px] active:shadow-none"
                >
                  สมัครสมาชิก
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="flex items-center justify-center gap-2 border-t-2 border-cocoa-100 px-4 py-6 text-center text-xs text-cocoa-500">
        <Mascot simple mood="sleepy" className="size-6" />
        hiwlaewQ · Cloud Computing Project · React + Node.js + MySQL on AWS
      </footer>
    </div>
  );
}

function NavItem({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cx(
          'flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
          isActive ? 'bg-brand-100 text-brand-700' : 'text-cocoa-600 hover:bg-brand-50 hover:text-cocoa-900',
        )
      }
    >
      <Icon className="size-4" aria-hidden />
      {label}
    </NavLink>
  );
}
