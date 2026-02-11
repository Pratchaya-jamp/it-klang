import { Suspense, lazy } from 'react'; // 1. เพิ่ม import
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import { ToastProvider } from './context/ToastContext';
import Loading from './components/Loading'; // Import Loading Component

// 2. เปลี่ยนการ Import Page ปกติ เป็น lazy
// const Dashboard = import('./pages/Dashboard'); // แบบเก่า (Synchronous)
const Dashboard = lazy(() => import('./pages/Dashboard')); // แบบใหม่ (Asynchronous)
const Inventory = lazy(() => import('./pages/Inventory'));

// หน้าอื่นๆ ก็ทำเผื่อไว้ได้เลย
const InventoryPlaceholder = () => <div className="p-10 text-center text-zinc-400">Inventory Module</div>;
const TransactionsPlaceholder = () => <div className="p-10 text-center text-zinc-400">Transactions Module</div>;
const SettingsPlaceholder = () => <div className="p-10 text-center text-zinc-400">Settings Module</div>;

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-zinc-100">
          <Navbar />
          
          <main className="w-full">
            {/* 3. ครอบ Routes ด้วย Suspense เพื่อรองรับ Lazy Component */}
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" />} />
                <Route path="/dashboard" element={<Dashboard />} />
                
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/transactions" element={<TransactionsPlaceholder />} />
                <Route path="/settings" element={<SettingsPlaceholder />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;