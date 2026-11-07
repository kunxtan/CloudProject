import { Navigate, Outlet, useLocation } from 'react-router';
import { Spinner } from '../components/ui.jsx';
import { homePathFor, useAuth } from '../context/AuthContext.jsx';

/** ต้อง login และ (ถ้าระบุ) ต้องมี role ที่กำหนด */
export function ProtectedRoute({ roles }) {
  const { user, loading, loggedOutManually } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner />;
  if (!user) {
    if (loggedOutManually) return <Navigate to="/login" replace />;
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (roles && !roles.includes(user.role)) return <Navigate to={homePathFor(user)} replace />;
  return <Outlet />;
}

/** staff/owner ไม่ต้องเห็นหน้าลูกค้า → ส่งไปหน้า dashboard */
export function CustomerArea() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user && user.role !== 'customer') return <Navigate to="/staff" replace />;
  return <Outlet />;
}
