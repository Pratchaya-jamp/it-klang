import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Loader2, Save, KeyRound, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility
function cn(...inputs) { return twMerge(clsx(inputs)); }

export default function ChangePassword() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  
  // รับค่าที่ส่งมาจากหน้า Login (staffId และรหัสผ่านเก่าที่เพิ่งกรอกมา)
  const { staffId, oldPassword } = location.state || {};

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  // Security Check: ถ้าไม่มีข้อมูลส่งมา (เช่น เข้าผ่าน URL เอง) ให้ดีดกลับไป Login
  useEffect(() => {
    if (!staffId || !oldPassword) {
      navigate('/login');
    }
  }, [staffId, oldPassword, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      showToast("New passwords do not match.", "error");
      return;
    }

    if (formData.newPassword.length < 6) {
      showToast("Password must be at least 6 characters.", "error");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        staffId: staffId,
        oldPassword: oldPassword, // ส่งค่าเดิมกลับไปยืนยัน
        newPassword: formData.newPassword
      };

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to change password.');
      }

      showToast("Password changed successfully! Please login again.", "success");
      
      // Clear session and redirect
      localStorage.removeItem('token');
      setTimeout(() => navigate('/login'), 1500);

    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  if (!staffId) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50/50 p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-zinc-100 overflow-hidden relative">
        
        {/* Decorative Header */}
        <div className="bg-amber-50/50 p-6 border-b border-amber-100/50 flex flex-col items-center text-center">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-full mb-3 shadow-sm">
                <ShieldCheck size={28} strokeWidth={1.5} />
            </div>
            <h2 className="text-lg font-bold text-zinc-900">Security Update Required</h2>
            <p className="text-xs text-zinc-500 mt-1 max-w-[250px]">
                For your security, please update your temporary password before continuing.
            </p>
        </div>

        <div className="p-8 pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Old Password (Locked) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Current Password (Locked)</label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                  <Lock size={18} />
                </div>
                <input 
                  type="password" 
                  value={oldPassword || ''} // ดึงค่าจาก State มาแสดง
                  disabled // ล็อคห้ามแก้ไข
                  className="w-full h-11 pl-10 pr-4 bg-zinc-100 border border-zinc-200 rounded-xl text-sm text-zinc-500 cursor-not-allowed focus:outline-none"
                />
              </div>
            </div>

            <div className="h-px bg-zinc-100 w-full my-2"></div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">New Password</label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-800 transition-colors">
                  <KeyRound size={18} />
                </div>
                <input 
                  type="password" 
                  name="newPassword"
                  required
                  placeholder="Enter new password"
                  value={formData.newPassword}
                  onChange={handleChange}
                  className="w-full h-11 pl-10 pr-4 bg-zinc-50 border border-zinc-100 rounded-xl text-sm text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300 transition-all placeholder:text-zinc-400"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Confirm New Password</label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-800 transition-colors">
                  <CheckCircle2 size={18} />
                </div>
                <input 
                  type="password" 
                  name="confirmPassword"
                  required
                  placeholder="Repeat new password"
                  value={formData.confirmPassword}
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
                  Updating...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Confirm Change
                </>
              )}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}