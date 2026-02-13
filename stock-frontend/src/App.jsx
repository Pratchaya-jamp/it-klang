import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import Loading from './components/Loading'; // ✅ ใช้อันเดิมของคุณ

// Lazy Import Pages
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Inventory = lazy(() => import('./pages/Inventory'));

// --- LAYOUTS ---

// 1. Layout สำหรับหน้าหลัก (✅ มี Navbar)
const MainLayout = () => {
  return (
    <div className="min-h-screen bg-zinc-50">
      <Navbar /> 
      <main className="container mx-auto py-6 px-4 md:px-8">
        <Outlet />
      </main>
    </div>
  );
};

// 2. Layout สำหรับหน้า Auth (❌ ไม่มี Navbar)
const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-white">
      <Outlet />
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          {/* ✅ Loading ใช้อันเดิมของคุณ */}
          <Suspense fallback={<Loading />}>
            <Routes>
              
              {/* === PUBLIC ROUTES (Login/Register) === */}
              {/* เข้าได้เฉพาะคนยังไม่ Login (ไม่มี Navbar) */}
              <Route element={<PublicRoute />}>
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                </Route>
              </Route>

              {/* === CHANGE PASSWORD === */}
              {/* ไม่มี Navbar */}
              <Route path="/changepwd" element={<ChangePassword />} />

              {/* === PROTECTED ROUTES (Dashboard) === */}
              {/* เข้าได้เฉพาะคน Login แล้ว (มี Navbar) */}
              <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/inventory" element={<Inventory />} />
                  {/* เพิ่มหน้าอื่นๆ ที่นี่ */}
                </Route>
              </Route>

              {/* === REDIRECTS === */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<Navigate to="/login" replace />} />

            </Routes>
          </Suspense>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;