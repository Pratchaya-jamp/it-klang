import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IdCard, Lock, Loader2, ArrowRight, LayoutDashboard } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility
function cn(...inputs) { return twMerge(clsx(inputs)); }

export default function Login() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    staffId: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); // 1. เริ่มหมุน

    try {
      // 2. หน่วงเวลา 3 วินาที (ให้ User รู้สึกว่ากำลังประมวลผล)
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 3. ยิง API Login
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Login failed. Please check your credentials.');
      }

      const data = await response.json();
      
      // ---------------------------------------------------------
      // 🔒 CHECK REQUIRE CHANGE PASSWORD FIRST
      // ---------------------------------------------------------
      if (data.requireChangePassword === true) {
        showToast("Security Alert: You must change your password.", "info");
        
        // ถ้าจำเป็นต้องใช้ token เพื่อเปลี่ยนรหัส ให้เก็บไว้ก่อน
        if (data.token) localStorage.setItem('token', data.token);

        // Force Redirect ไปหน้า Change Password
        navigate('/changepwd', { 
          state: { 
            staffId: formData.staffId, 
            oldPassword: formData.password 
          },
          replace: true 
        });
        
        return;
      }

      // --- NORMAL LOGIN SUCCESS ---
      if (data.token) {
        localStorage.setItem('token', data.token);
        showToast("Welcome back!", "success");
        navigate('/dashboard');
      } else {
        throw new Error('Authentication Error: No token received.');
      }

    } catch (error) {
      console.error("Login Error:", error);
      showToast(error.message || "Something went wrong", "error");
    } finally {
      setLoading(false); // 4. หยุดหมุน (หลังจากผ่านไป 3 วิ + API Response)
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50/50 p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-zinc-100 overflow-hidden relative">
        
        <div className="relative p-8">
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 text-white mb-4 shadow-lg shadow-zinc-200">
              <LayoutDashboard size={20} />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Welcome Back</h1>
            <p className="text-sm text-zinc-500 mt-2">Sign in to access your inventory.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Staff ID</label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-800 transition-colors">
                  <IdCard size={18} />
                </div>
                <input 
                  type="text" 
                  name="staffId"
                  required
                  placeholder="e.g. 901196"
                  value={formData.staffId}
                  onChange={handleChange}
                  className="w-full h-11 pl-10 pr-4 bg-zinc-50 border border-zinc-100 rounded-xl text-sm text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300 transition-all placeholder:text-zinc-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Password</label>
                <a href="#" className="text-[10px] font-medium text-zinc-500 hover:text-zinc-800 transition-colors">Forgot password?</a>
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
                  Verifying... {/* เปลี่ยนข้อความให้ดูสมจริงขึ้น */}
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

          </form>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-zinc-500">
              New employee?{' '}
              <Link to="/register" className="font-semibold text-zinc-900 hover:text-zinc-700 hover:underline transition-colors">
                Create account
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}