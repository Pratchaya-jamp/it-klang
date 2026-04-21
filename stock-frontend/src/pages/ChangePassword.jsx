import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, ShieldCheck, Loader2, ArrowRight, KeyRound } from 'lucide-react';
import { request } from '../utils/fetchUtils';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function ChangePassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { user, logout } = useAuth(); 

  // ดึงข้อมูลจาก state ที่ส่งมาจาก Login (ถ้ามี)
  const stateData = location.state || {};
  const isFirstLogin = !!stateData.oldPassword; 

  const [formData, setFormData] = useState({
    staffId: stateData.staffId || user?.staffId || '',
    oldPassword: stateData.oldPassword || '', 
    newPassword: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);

  // ตรวจสอบเงื่อนไขความปลอดภัย
  useEffect(() => {
    // 1. ถ้าไม่ได้เปลี่ยนรหัสครั้งแรก และไม่ได้ Login อยู่ (ไม่มี user) ให้เด้งไปหน้า Login
    if (!isFirstLogin && !user) {
      navigate('/login', { replace: true });
      return;
    }
    
    // 2. ถ้าไม่มีข้อมูลพนักงานเลย (กรณีพิมพ์ URL เข้ามาเองดื้อๆ)
    if (!formData.staffId) {
      navigate('/login', { replace: true });
    }
  }, [isFirstLogin, user, navigate, formData.staffId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      showToast("รหัสผ่านไม่ตรงกัน", "error");
      return;
    }

    setLoading(true);
    try {
      // ✅ Artificial Delay 2.5 วินาทีตามที่ขอ
      await new Promise(resolve => setTimeout(resolve, 2500));

      await request('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          staffId: formData.staffId, // ✅ แก้จาก staffId เป็น formData.staffId
          oldPassword: formData.oldPassword,
          newPassword: formData.newPassword
        })
      });

      showToast("อัปเดตรหัสผ่านเรียบร้อยแล้ว!", "success");

      if (isFirstLogin) {
        // กรณีบังคับเปลี่ยนครั้งแรก: ให้ Logout เพื่อไป Login ใหม่ด้วยรหัสใหม่
        await logout(); 
        navigate('/login', { replace: true });
      } else {
        // กรณีเปลี่ยนเองหลัง Login: ให้กลับไปหน้า Profile
        navigate('/profile');
      }

    } catch (error) {
      showToast(error.message || "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50/50 p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-zinc-100 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500">
        <div className="p-8">
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 text-white mb-4 shadow-lg shadow-zinc-200">
              <ShieldCheck size={20} />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
              {isFirstLogin ? 'ตั้งค่าความปลอดภัย' : 'เปลี่ยนรหัสผ่าน'}
            </h1>
            <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
              {isFirstLogin 
                ? 'โปรดเปลี่ยนรหัสผ่านสำหรับการเข้าสู่ระบบครั้งแรก' 
                : 'กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่ของคุณ'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">รหัสผ่านปัจจุบัน</label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-800 transition-colors">
                  <KeyRound size={18} />
                </div>
                <input 
                  type="password"
                  required
                  placeholder="••••••••"
                  // 🔒 ถ้า Login ครั้งแรก จะ Disabled ไว้เพราะดึงรหัสเก่ามาให้แล้วจากหน้า Login
                  disabled={isFirstLogin}
                  value={formData.oldPassword}
                  onChange={(e) => setFormData({...formData, oldPassword: e.target.value})}
                  className="w-full h-11 pl-10 pr-4 bg-zinc-50 border border-zinc-100 rounded-xl text-sm text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300 transition-all disabled:opacity-60"
                />
              </div>
            </div>

            <hr className="border-zinc-50 my-2" />

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">รหัสผ่านใหม่</label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-800 transition-colors">
                  <Lock size={18} />
                </div>
                <input 
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                  className="w-full h-11 pl-10 pr-4 bg-zinc-50 border border-zinc-100 rounded-xl text-sm text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">ยืนยันรหัสผ่านใหม่</label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-800 transition-colors">
                  <Lock size={18} />
                </div>
                <input 
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  className="w-full h-11 pl-10 pr-4 bg-zinc-50 border border-zinc-100 rounded-xl text-sm text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300 transition-all"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full h-12 bg-zinc-900 text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 active:scale-[0.98] transition-all shadow-lg shadow-zinc-200 disabled:opacity-70 flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  กำลังอัปเดต...
                </>
              ) : (
                <>
                  อัปเดตรหัสผ่าน
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            {!isFirstLogin && (
              <button 
                type="button"
                onClick={() => navigate(-1)}
                className="w-full text-zinc-400 text-xs hover:text-zinc-600 transition-colors py-2"
              >
                ย้อนกลับ
              </button>
            )}

          </form>
        </div>
      </div>
    </div>
  );
}