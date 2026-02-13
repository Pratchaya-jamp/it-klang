import { createContext, useContext, useState, useEffect } from 'react';
import { request } from '../utils/fetchUtils';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // สถานะโหลดตอนเปิดเว็บครั้งแรก

  // 1. Check Session on Mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // ยิงไปถาม Backend ว่า Session นี้ Valid ไหม?
      // Backend ต้องมี Endpoint นี้ที่ return ข้อมูล user ถ้า cookie ถูกต้อง
      const userData = await request('/api/auth/me'); 
      setUser(userData);
    } catch (error) {
      // ถ้า 401 หรือ Error แปลว่ายังไม่ Login
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // 2. Login Action
  const login = async (credentials) => {
    // ยิง Login ปกติ (Backend จะ Set-Cookie กลับมาใน Header)
    const data = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    // ถ้า Login ผ่านและต้องเปลี่ยนรหัส (Backend ควรส่ง Flag นี้มา)
    if (data.requireChangePassword) {
        return { requireChangePassword: true, ...data };
    }

    // Login สำเร็จ -> Set User State
    // (เราอาจใช้ data ที่ได้จากการ login หรือยิง /me อีกรอบก็ได้)
    setUser(data.user || data); 
    return { success: true };
  };

  // 3. Logout Action
  const logout = async () => {
    try {
      // บอก Backend ให้ Clear Cookie
      await request('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error("Logout error", error);
    } finally {
      setUser(null);
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};