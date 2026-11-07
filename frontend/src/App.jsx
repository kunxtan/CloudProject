import { lazy, Suspense } from 'react';
import { Link, Route, Routes } from 'react-router';
import { Layout } from './components/Layout.jsx';
import { Mascot } from './components/Mascot.jsx';
import { EmptyState, Spinner } from './components/ui.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import RegisterPage from './pages/auth/RegisterPage.jsx';
import MyQueuePage from './pages/customer/MyQueuePage.jsx';
import ProfilePage from './pages/profile/ProfilePage.jsx';
import RestaurantDetailPage from './pages/customer/RestaurantDetailPage.jsx';
import RestaurantSearchPage from './pages/customer/RestaurantSearchPage.jsx';
import { RequireRestaurant } from './pages/staff/RequireRestaurant.jsx';
import { CustomerArea, ProtectedRoute } from './routes/ProtectedRoute.jsx';

// หน้าร้านค้าโหลดแยก (lazy) → ลูกค้าไม่ต้องดาวน์โหลดโค้ด dashboard/กราฟ
const QueueDashboardPage = lazy(() => import('./pages/staff/QueueDashboardPage.jsx'));
const TableManagerPage = lazy(() => import('./pages/staff/TableManagerPage.jsx'));
const StatsPage = lazy(() => import('./pages/staff/StatsPage.jsx'));
const RestaurantSettingsPage = lazy(() => import('./pages/staff/RestaurantSettingsPage.jsx'));
const StaffManagerPage = lazy(() => import('./pages/staff/StaffManagerPage.jsx'));

export default function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <AppRoutes />
    </Suspense>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<Layout />}>
        {/* ลูกค้า / ผู้เยี่ยมชม */}
        <Route element={<CustomerArea />}>
          <Route index element={<RestaurantSearchPage />} />
          <Route path="restaurants/:id" element={<RestaurantDetailPage />} />
          <Route element={<ProtectedRoute roles={['customer']} />}>
            <Route path="my-queue" element={<MyQueuePage />} />
          </Route>
        </Route>

        {/* ทุก role ที่ login แล้ว */}
        <Route element={<ProtectedRoute />}>
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* ร้านค้า */}
        <Route path="staff" element={<ProtectedRoute roles={['staff', 'owner']} />}>
          <Route element={<ProtectedRoute roles={['owner']} />}>
            <Route path="settings" element={<RestaurantSettingsPage />} />
          </Route>
          <Route element={<RequireRestaurant />}>
            <Route index element={<QueueDashboardPage />} />
            <Route path="tables" element={<TableManagerPage />} />
            <Route path="stats" element={<StatsPage />} />
            <Route element={<ProtectedRoute roles={['owner']} />}>
              <Route path="members" element={<StaffManagerPage />} />
            </Route>
          </Route>
        </Route>

        <Route
          path="*"
          element={
            <div className="mx-auto max-w-lg py-6">
              <EmptyState
                illustration={<Mascot mood="sleepy" className="size-28" />}
                title="ไม่พบหน้านี้"
                description="ลิงก์อาจพิมพ์ผิด หรือหน้านี้ถูกย้ายไปแล้ว"
                action={
                  <Link
                    to="/"
                    className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-pop transition-all hover:bg-brand-600 active:translate-y-[3px] active:shadow-none"
                  >
                    กลับหน้าแรก
                  </Link>
                }
              />
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
