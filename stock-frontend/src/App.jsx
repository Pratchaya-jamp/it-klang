import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import { ToastProvider } from './context/ToastContext'; // Import Provider

function App() {
  return (
    <BrowserRouter>
      {/* ครอบด้วย Provider */}
      <ToastProvider>
        <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-zinc-100">
          <Navbar />
          <main className="w-full">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/inventory" element={<div className="p-10 text-center text-zinc-400">Inventory Page</div>} />
              <Route path="/transactions" element={<div className="p-10 text-center text-zinc-400">Transactions Page</div>} />
              <Route path="/settings" element={<div className="p-10 text-center text-zinc-400">Settings Page</div>} />
            </Routes>
          </main>
        </div>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;