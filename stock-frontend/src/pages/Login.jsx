import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { IdCard, Lock, Loader2, ArrowRight, LayoutDashboard, Mail, X, CheckCircle2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../context/AuthContext';
import { request } from '../utils/fetchUtils';

// Utility
function cn(...inputs) { return twMerge(clsx(inputs)); }

const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); 
  const [errorMessage, setErrorMessage] = useState('');

  // Animation States
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // 1. ✅ RESET FORM เมื่อเปิด Modal ใหม่
  useEffect(() => {
    if (isOpen) {
      setEmail('');        // ล้างอีเมล
      setStatus('idle');   // ล้างสถานะ
      setErrorMessage(''); // ล้าง Error
      
      setIsMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setIsVisible(true)));
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setIsMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isMounted) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      // 2. ✅ เพิ่ม Artificial Delay 2 วินาที
      await new Promise(resolve => setTimeout(resolve, 2000));

      await request('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
      setErrorMessage(error.message || "ไม่พบอีเมลนี้ในระบบหรือเกิดข้อผิดพลาด");
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop: Fade In/Out */}
      <div 
        className={cn(
          "absolute inset-0 bg-zinc-900/40 backdrop-blur-sm transition-opacity duration-300 ease-out",
          isVisible ? "opacity-100" : "opacity-0"
        )} 
        onClick={onClose} 
      />
      
      {/* Content: Zoom & Fade In/Out */}
      <div className={cn(
        "relative bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl border border-zinc-100 flex flex-col gap-6 transform transition-all duration-300 ease-out",
        isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"
      )}>
        
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-full transition-colors duration-200">
          <X size={20}/>
        </button>

        {status === 'success' ? (
          <div className="text-center py-4 animate-in fade-in zoom-in-95 duration-500">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm shadow-emerald-100">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-zinc-900">ตรวจสอบอีเมลของคุณ</h3>
            <p className="text-zinc-500 mt-2 text-sm leading-relaxed">เราได้ส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปที่ <br/><span className="font-medium text-zinc-800">{email}</span></p>
            <button onClick={onClose} className="mt-6 w-full h-11 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-all hover:scale-[1.02] active:scale-[0.98]">กลับไปหน้าเข้าสู่ระบบ</button>
          </div>
        ) : (
          <>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm shadow-blue-100">
                <Mail size={24} />
              </div>
              <h3 className="text-xl font-bold text-zinc-900">ลืมรหัสผ่าน?</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">กรอกที่อยู่อีเมลของคุณ แล้วเราจะส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปให้</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">ที่อยู่อีเมล</label>
                <div className="relative group">
                   <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-zinc-800" size={18} />
                   <input 
                     type="email" required placeholder="กรอกอีเมลของคุณ" 
                     value={email} onChange={e => setEmail(e.target.value)}
                     className="w-full h-11 pl-10 pr-4 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300 transition-all duration-200"
                   />
                </div>
              </div>
              
              {status === 'error' && (
                <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg text-center font-medium animate-in slide-in-from-top-2 fade-in duration-300">
                  {errorMessage}
                </div>
              )}

              <button disabled={status === 'loading'} className="w-full h-11 bg-zinc-900 text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:scale-100">
                {status === 'loading' ? <Loader2 size={18} className="animate-spin" /> : "ส่งลิงก์รีเซ็ตรหัสผ่าน"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};

export default function Login() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    staffId: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Artificial Delay

      // เรียกใช้ login จาก AuthContext (ซึ่งข้างในใช้ request จาก fetchUtils)
      const result = await login(formData);

      // เช็คกรณีต้องเปลี่ยนรหัส
      if (result.requireChangePassword) {
        showToast("แจ้งเตือนความปลอดภัย: กรุณาเปลี่ยนรหัสผ่านของคุณ", "info");
        navigate('/force-changepwd', { state: { staffId: formData.staffId, oldPassword: formData.password }, replace: true });
        return;
      }

      // Login สำเร็จ
      showToast("ยินดีต้อนรับกลับ!", "success");
      navigate('/dashboard');

    } catch (error) {
      console.error("Login Error:", error);
      showToast(error.message || "รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50/50 p-4">
      <ForgotPasswordModal isOpen={isForgotOpen} onClose={() => setIsForgotOpen(false)} />
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-zinc-100 overflow-hidden relative">
        
        <div className="relative p-8">
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 text-white mb-4 shadow-lg shadow-zinc-200">
              <LayoutDashboard size={20} />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">ยินดีต้อนรับกลับ</h1>
            <p className="text-sm text-zinc-500 mt-2">เข้าสู่ระบบเพื่อจัดการคลังอุปกรณ์ของคุณ</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">รหัสพนักงาน</label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-800 transition-colors">
                  <IdCard size={18} />
                </div>
                <input 
                  type="text" 
                  name="staffId"
                  required
                  placeholder="เช่น 901196"
                  value={formData.staffId}
                  onChange={handleChange}
                  className="w-full h-11 pl-10 pr-4 bg-zinc-50 border border-zinc-100 rounded-xl text-sm text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300 transition-all placeholder:text-zinc-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">รหัสผ่าน</label>
                <button type="button" onClick={() => setIsForgotOpen(true)} className="text-[10px] font-medium text-zinc-500 hover:text-zinc-800 transition-colors">ลืมรหัสผ่าน?</button>
              </div>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-800 transition-colors">
                  <Lock size={18} />
                </div>
                <input 
                  type="password" 
                  name="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full h-11 pl-10 pr-4 bg-zinc-50 border border-zinc-100 rounded-xl text-sm text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300 transition-all placeholder:text-zinc-400"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full h-12 bg-zinc-900 text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 active:scale-[0.98] transition-all shadow-lg shadow-zinc-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  กำลังตรวจสอบ... {/* เปลี่ยนข้อความให้ดูสมจริงขึ้น */}
                </>
              ) : (
                <>
                  เข้าสู่ระบบ
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

          </form>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-zinc-500">
              พนักงานใหม่?{' '}
              <Link to="/register" className="font-semibold text-zinc-900 hover:text-zinc-700 hover:underline transition-colors">
                สร้างบัญชีผู้ใช้
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}