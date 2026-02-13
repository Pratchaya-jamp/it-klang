import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  // 1. กำลังเช็ค Session กับ Server (Show Loading Screen)
  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-zinc-900" size={32} />
          <p className="text-zinc-400 text-xs font-medium uppercase tracking-widest">Verifying Session...</p>
        </div>
      </div>
    );
  }

  // 2. ถ้าไม่มี User -> ดีดไป Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3. ถ้ามี User -> อนุญาตให้เข้า (Render Child Routes)
  return <Outlet />;
}