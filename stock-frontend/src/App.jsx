import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import Loading from './components/Loading'; 
import MiniFooter from './components/MiniFooter';

// Lazy Import Pages
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Transactions = lazy(() => import('./pages/Transactions'));
const AuditLog = lazy(() => import('./pages/AuditLog'));
const Profile = lazy(() => import('./pages/Profile'));
const EditProfile = lazy(() => import('./pages/EditProfile'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const LoginLogs = lazy(() => import('./pages/LoginLogs'));
const Borrowing = lazy(() => import('./pages/Borrowing'));
const Troubleshoot = lazy(() => import('./pages/Troubleshoot'));
const SupportTickets = lazy(() => import('./pages/SupportTickets'));
const NotFound = lazy(() => import('./pages/NotFound'));
const About = lazy(() => import('./pages/About'));
const ApiDocs = lazy(() => import('./pages/ApiDocs'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const CookiesPolicy = lazy(() => import('./pages/CookiesPolicy'));

// --- LAYOUTS ---

// 1. Layout สำหรับหน้าหลัก (มี Navbar + Footer)
const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <Navbar /> 
      <main className="container mx-auto py-6 px-4 md:px-8 flex-1">
        <Outlet />
      </main>
      <MiniFooter /> 
    </div>
  );
};

// 2. Layout สำหรับหน้า Auth (ไม่มี Navbar มีแต่ Footer)
const AuthLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      <MiniFooter />
    </div>
  );
};

// 3. Layout สำหรับหน้า Error (404) ที่ต้องการให้อยู่กึ่งกลางจอ
const MinimalLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <main className="flex-1 flex flex-col items-center justify-center">
        <Outlet />
      </main>
      <MiniFooter />
    </div>
  );
};

// 4. Layout สำหรับหน้าทั่วไป (เข้าได้ทุกคน ไม่มี Navbar เต็มรูปแบบ แต่มี Minimal Header)
const SharedLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      
      {/* --- ส่วนที่เพิ่มเข้ามา: Minimal Header --- */}
      <header className="w-full bg-white border-b border-zinc-200/60 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-zinc-900 text-white rounded-lg flex items-center justify-center font-bold text-xs shadow-sm">
              IT
            </div>
            <span className="font-bold text-zinc-900 tracking-tight hidden sm:block">IT-KLANG Operations</span>
          </Link>
          
          <Link 
            to="/dashboard" 
            className="h-9 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-sm font-medium transition-all flex items-center gap-2 active:scale-95"
          >
            <ArrowLeft size={16} />
            <span>เข้าสู่ระบบ / หน้าหลัก</span>
          </Link>
        </div>
      </header>

      {/* --- เนื้อหาหลัก --- */}
      <main className="container mx-auto py-6 px-4 md:px-8 flex-1">
        <Outlet />
      </main>

      {/* --- Footer --- */}
      <MiniFooter />
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Suspense fallback={<Loading />}>
            <Routes>
              
              {/* === PUBLIC ROUTES (เข้าได้เฉพาะตอนยังไม่ Login) === */}
              <Route element={<PublicRoute />}>
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/force-changepwd" element={<ChangePassword />} />
                </Route>
              </Route>

              {/* === ✅ SHARED ROUTES (เข้าได้ทุกคน ทั้งที่ Login แล้วและยังไม่ Login) === */}
              <Route element={<SharedLayout />}>
                <Route path="/about" element={<About />} />
                <Route path="/api-docs" element={<ApiDocs />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/cookies" element={<CookiesPolicy />} />
              </Route>

              {/* === PROTECTED ROUTES (เข้าได้เฉพาะคน Login แล้ว) === */}
              <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/transactions" element={<Transactions />} />
                  <Route path="/audit" element={<AuditLog />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/changepwd" element={<ChangePassword />} />
                  <Route path="/profile/edit" element={<EditProfile />} />
                  <Route path="/user-manage" element={<UserManagement />} />
                  <Route path="/access-logs" element={<LoginLogs />} />
                  <Route path="/borrowing" element={<Borrowing />} />
                  <Route path="/troubleshoot" element={<Troubleshoot />} />
                  <Route path="/support-tickets" element={<SupportTickets />} />
                </Route>
              </Route>

              {/* === REDIRECTS & 404 === */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              
              <Route element={<MinimalLayout />}>
                <Route path="*" element={<NotFound />} />
              </Route>

            </Routes>
          </Suspense>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;