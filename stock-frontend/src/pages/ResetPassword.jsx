import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, Lock, Loader2, ArrowRight, ShieldAlert } from 'lucide-react';
import { request } from '../utils/fetchUtils';
import { useToast } from '../context/ToastContext';

// --- Local Check ---
const validateStructure = (token) => {
  if (!token) return false;
  const parts = token.split('.');
  return parts.length === 3;
};

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  // --- STATE ---
  const [isVerifying, setIsVerifying] = useState(true); // Loading ตอนเริ่มเข้าหน้าเว็บ
  const [isValidToken, setIsValidToken] = useState(false);
  const [token, setToken] = useState('');
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [status, setStatus] = useState('idle'); // idle, loading (ตอนกดปุ่ม)

  const isToastShown = useRef(false);

  // --- 1. ตรวจสอบ Token ตอนเข้าหน้าเว็บ ---
  useEffect(() => {
    const urlToken = searchParams.get('token');
    window.history.replaceState(null, '', '/reset-password');

    const verifyTokenOnServer = async () => {
      // 1.1 เช็คโครงสร้าง
      if (!urlToken || !validateStructure(urlToken)) {
         handleInvalid("Security check failed: Malformed token.");
         return;
      }

      try {
        // 1.2 ยิงเช็ค Server
        await request(`/api/auth/validate-reset-token?token=${urlToken}`);

        // ผ่าน: เก็บ Token, ปลดล็อคฟอร์ม
        setToken(urlToken);
        setIsValidToken(true);
        
        if (!isToastShown.current) {
          showToast("Identity verified. Please set your new password.", "info");
          isToastShown.current = true;
        }

      } catch (error) {
        console.error("Verification failed:", error);
        handleInvalid("Invalid, expired, or tampered token.");
      } finally {
        setIsVerifying(false); // หยุด Loading หน้าเว็บ
      }
    };

    verifyTokenOnServer();
  }, []);

  const handleInvalid = (msg) => {
    setIsValidToken(false);
    setIsVerifying(false);
    if (!isToastShown.current) {
      showToast(msg, "error");
      isToastShown.current = true;
    }
    // ถ้า Token ผิด ให้ดีดกลับ Login เลย (หลังจากรอแป๊บนึง หรือจะให้ User กดเองก็ได้)
    setTimeout(() => navigate('/login', { replace: true }), 3000);
  };

  // --- 2. เปลี่ยนรหัสผ่าน ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }
    if (newPassword.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }

    setStatus('loading'); // เริ่มหมุน
    
    try {
      // 1. ✅ Artificial Delay (2 วินาที) ให้ User เห็นว่ากำลังทำงาน
      await new Promise(resolve => setTimeout(resolve, 2000));

      await request('/api/auth/reset-password-token', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword })
      });

      // 2. ✅ สำเร็จ -> แจ้งเตือน -> รอแป๊บนึง -> ดีดไป Login
      showToast("Password updated successfully! Redirecting...", "success");
      
      // รออีก 1 วินาที ให้ User อ่าน Toast ก่อนเด้ง
      setTimeout(() => {
          navigate('/login', { replace: true });
      }, 1000);

    } catch (error) {
      showToast(error.message || "Reset failed.", "error");
      setStatus('idle'); // หยุดหมุน ถ้าพลาด
      
      if (error.message?.toLowerCase().includes('token')) {
         setIsValidToken(false);
         setTimeout(() => navigate('/login', { replace: true }), 2000);
      }
    }
  };

  // --- UI 1: FULL PAGE LOADING (ตอนเช็ค Token) ---
  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-300">
          <Loader2 size={40} className="animate-spin text-zinc-900" />
          <p className="text-zinc-500 text-sm font-medium tracking-wide">Verifying security token...</p>
        </div>
      </div>
    );
  }

  // --- UI 2: ACCESS DENIED (Token ผิด) ---
  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl text-center border border-zinc-100 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-50">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-xl font-bold text-zinc-900">Access Denied</h2>
          <p className="text-zinc-500 mt-2 text-sm px-4">
             Token validation failed. Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  // --- UI 3: FORM (ไม่ต้องมีหน้า Success แล้ว เพราะดีดไป Login เลย) ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50/50 p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-zinc-100 overflow-hidden relative animate-in fade-in slide-in-from-bottom-8 duration-500">
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 text-white mb-4 shadow-lg shadow-zinc-200"><KeyRound size={20} /></div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Set New Password</h1>
            <p className="text-sm text-zinc-500 mt-2">Create a new password for your account.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">New Password</label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-zinc-800"><Lock size={18} /></div>
                <input type="password" required placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full h-11 pl-10 pr-4 bg-zinc-50 border border-zinc-100 rounded-xl text-sm text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300 transition-all" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Confirm Password</label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-zinc-800"><Lock size={18} /></div>
                <input type="password" required placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full h-11 pl-10 pr-4 bg-zinc-50 border border-zinc-100 rounded-xl text-sm text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300 transition-all" />
              </div>
            </div>
            <button type="submit" disabled={status === 'loading'} className="w-full h-12 bg-zinc-900 text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 active:scale-[0.98] transition-all shadow-lg shadow-zinc-200 disabled:opacity-70 flex items-center justify-center gap-2">
              {/* ถ้า Loading ให้ขึ้น Loading ตรงนี้เลย */}
              {status === 'loading' ? <><Loader2 size={18} className="animate-spin" /> Resetting...</> : <>Reset Password <ArrowRight size={18} /></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}