import axios from 'axios';

const TOKEN_KEY = 'hiwlaewq.token';

export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* private mode — ใช้ต่อได้แค่ในแท็บนี้ */
    }
  },
};

// baseURL เป็น path สัมพัทธ์ → dev ผ่าน Vite proxy, production ผ่าน CloudFront (/api/* → ALB)
export const api = axios.create({ baseURL: '/api', timeout: 15_000 });

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && tokenStore.get()) {
      tokenStore.set(null);
      window.dispatchEvent(new Event('hiwlaewq:logout'));
    }
    return Promise.reject(error);
  },
);

/** ข้อความ error ที่แสดงให้ผู้ใช้เห็น (backend ส่งข้อความภาษาไทยมาแล้ว) */
export function errorMessage(err) {
  if (err?.response?.data?.error?.message) return err.response.data.error.message;
  if (err?.code === 'ERR_NETWORK') return 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต';
  if (err?.code === 'ECONNABORTED') return 'เซิร์ฟเวอร์ตอบช้าเกินไป กรุณาลองใหม่';
  return err?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่';
}

export const errorCode = (err) => err?.response?.data?.error?.code;
