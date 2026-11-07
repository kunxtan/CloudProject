import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { tokenStore } from '../api/client.js';
import { authApi } from '../api/endpoints.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(tokenStore.get()));
  // กดออกจากระบบเอง → ไม่ต้องจำหน้าเดิมไว้ใน ?next= (ไม่งั้นคนถัดไปที่ login จะถูกพาไปหน้าของคนก่อน)
  // ต่างจาก token หมดอายุกลางคัน ที่ควรพากลับมาหน้าเดิมหลัง login ใหม่
  const [loggedOutManually, setLoggedOutManually] = useState(false);

  const logout = useCallback(() => {
    tokenStore.set(null);
    setLoggedOutManually(true);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await authApi.me();
    setUser(me);
    return me;
  }, []);

  // มี token ค้างไว้ → โหลดข้อมูลผู้ใช้
  useEffect(() => {
    if (!tokenStore.get()) return;
    refreshUser()
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [refreshUser, logout]);

  // token หมดอายุ (API ตอบ 401) → ออกจากระบบ
  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('hiwlaewq:logout', onLogout);
    return () => window.removeEventListener('hiwlaewq:logout', onLogout);
  }, []);

  const applySession = useCallback(({ token, user: u }) => {
    tokenStore.set(token);
    setLoggedOutManually(false);
    setUser(u);
    return u;
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      loggedOutManually,
      login: async (body) => applySession(await authApi.login(body)),
      register: async (body) => applySession(await authApi.register(body)),
      logout,
      refreshUser,
      /** แก้โปรไฟล์ → อัปเดตข้อมูลผู้ใช้ทั้งแอป (header, เมนู ฯลฯ) */
      updateProfile: async (body) => {
        const u = await authApi.updateMe(body);
        setUser(u);
        return u;
      },
    }),
    [user, loading, loggedOutManually, applySession, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export const isStaffRole = (role) => role === 'staff' || role === 'owner';

/** หน้าแรกของแต่ละ role หลัง login */
export const homePathFor = (user) => (isStaffRole(user?.role) ? '/staff' : '/');
