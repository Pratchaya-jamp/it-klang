import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function PublicRoute() {
  // ดึงค่า user และ loading มาจาก AuthContext (เหมือนที่ใช้ใน ProtectedRoute)
  const { user, loading } = useAuth();

  // 1. ระหว่างเช็คสถานะ ให้หมุนรอไปก่อน (เพื่อไม่ให้มันดีดมั่ว)
  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-zinc-900" size={32} />
      </div>
    );
  }

  // 2. ถ้ามี User แล้ว (Login อยู่) -> ห้ามเข้าหน้านี้ ให้ดีดไป Dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // 3. ถ้ายังไม่มี User -> อนุญาตให้เข้าได้ (แสดงหน้า Login/Register)
  return <Outlet />;
}