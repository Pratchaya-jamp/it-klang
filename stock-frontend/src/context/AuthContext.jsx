import { createContext, useContext, useState, useEffect } from 'react';
import { request } from '../utils/fetchUtils';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Check Session on Mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await request('/api/auth/me'); 
      
      // ✅ แก้ไข: เช็คว่ามี key "data" หุ้มอยู่ไหม ถ้ามีให้แกะออกมา
      const userData = response.data || response;
      
      console.log("CheckAuth User:", userData); // Debug ดูว่าได้ Role มาถูกต้องไหม
      setUser(userData);

    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // 2. Login Action
  const login = async (credentials) => {
    const response = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    // ถ้าต้องเปลี่ยนรหัสผ่าน ส่งกลับไปให้ Login.jsx จัดการ
    if (response.requireChangePassword) {
        return { requireChangePassword: true, ...response };
    }

    // ✅ แก้ไข: แกะ data ออกมาเหมือนกัน เพื่อให้ Format ตรงกันทั้งแอป
    // กรณี Login API อาจส่งมาเป็น { token: "...", user: { ... } } หรือ { data: { ... } }
    // ปรับบรรทัดนี้ให้ตรงกับ Response จริงของ Login API
    const userData = response.data || response.user || response;
    
    console.log("Login User:", userData); // Debug
    setUser(userData); 
    
    return { success: true };
  };

  // 3. Logout Action
  const logout = async () => {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error("Logout error", error);
    } finally {
      setUser(null);
      // ใช้ window.location เพื่อ clear state ทั้งหมดให้สะอาดจริงๆ
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};