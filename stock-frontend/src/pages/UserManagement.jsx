import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, Search, Edit3, Shield, Mail, CheckCircle, 
  Loader2, Save, X, RotateCcw, AlertTriangle, KeyRound, ArrowRight, Lock 
} from 'lucide-react';
import { request } from '../utils/fetchUtils';
import { useToast } from '../context/ToastContext';

const AdminResetPasswordModal = ({ isOpen, onClose, user }) => {
  const { showToast } = useToast();
  
  // Steps: 
  // 0 = Confirm Start (ถามยืนยันเริ่ม)
  // 1 = OTP Input (กรอก OTP)
  // 2 = Password Input (กรอกรหัสใหม่)
  // 3 = Confirm Save (ถามยืนยันบันทึก)
  const [step, setStep] = useState(0); 
  const [loading, setLoading] = useState(false);
  
  // Form Data
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Reset State เมื่อเปิด Modal ใหม่
  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setOtpCode('');
      setNewPassword('');
      setConfirmPassword('');
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  // --- STEP 1: Request OTP ---
  const handleRequestOtp = async () => {
    setLoading(true);
    try {
      // Loading 2 วินาที
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // ยิง API ขอ OTP (ส่ง targetStaffId ไปด้วยเพื่อให้รู้ว่าขอของใคร)
      await request('/api/auth/admin/request-otp', {
        method: 'POST',
        body: JSON.stringify({ targetStaffId: user.staffId })
      });

      showToast("OTP sent successfully", "success");
      setStep(1); // ไปหน้ากรอก OTP
    } catch (error) {
      showToast(error.message || "Failed to request OTP", "error");
    } finally {
      setLoading(false);
    }
  };

  // --- STEP 2: Submit OTP (ข้าม Validation ไปก่อน) ---
  const handleSubmitOtp = (e) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      showToast("Please enter a valid 6-digit OTP", "error");
      return;
    }
    setStep(2); // ไปหน้ากรอกรหัสผ่าน
  };

  // --- STEP 3: Validate Password & Go to Confirm ---
  const handlePreSubmitPassword = (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }
    setStep(3); // ไปหน้ายืนยันครั้งสุดท้าย
  };

  // --- STEP 4: Final Submit (Reset Password) ---
  const handleFinalSubmit = async () => {
    setLoading(true);
    try {
      // Loading 2 วินาที (Optional แต่ใส่เพื่อให้ UX เหมือนตอนขอ OTP)
      await new Promise(resolve => setTimeout(resolve, 2000));

      await request('/api/auth/admin/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          targetStaffId: user.staffId,
          newPassword: newPassword,
          otpCode: otpCode
        })
      });

      showToast("Password reset successfully", "success");
      onClose(); // ปิด Modal จบงาน
    } catch (error) {
      showToast(error.message || "Failed to reset password", "error");
      // ถ้า Error อาจจะให้กลับไปแก้ OTP หรือ Password (ในที่นี้ให้ปิดไปก่อนหรือกลับไป Step 2)
      setStep(2); 
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md p-6 rounded-2xl shadow-2xl border border-zinc-100 flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <KeyRound size={20} className="text-zinc-900"/> Admin Password Reset
            </h3>
            <p className="text-sm text-zinc-500">Target: <span className="font-mono font-bold text-zinc-700">{user.staffId}</span> ({user.name})</p>
          </div>
          <button onClick={onClose} disabled={loading} className="p-1 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-900 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* --- CONTENT BY STEP --- */}
        
        {/* STEP 0: Confirm Start */}
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <div className="p-4 bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-100 flex gap-3">
              <AlertTriangle className="shrink-0" size={20} />
              <p className="text-sm">
                This action requires OTP verification. Are you sure you want to proceed with resetting the password for this user?
              </p>
            </div>
            <div className="flex gap-3 mt-2">
              <button onClick={onClose} className="flex-1 h-11 bg-zinc-100 text-zinc-600 font-semibold rounded-xl hover:bg-zinc-200 transition-all">
                No, Cancel
              </button>
              <button onClick={handleRequestOtp} disabled={loading} className="flex-1 h-11 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 flex items-center justify-center gap-2 transition-all">
                {loading ? <Loader2 size={18} className="animate-spin"/> : 'Yes, Proceed'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: OTP Input */}
        {step === 1 && (
          <form onSubmit={handleSubmitOtp} className="flex flex-col gap-4">
             <div className="text-center space-y-2">
               <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                 <Mail size={24} />
               </div>
               <h4 className="text-zinc-900 font-bold">Enter OTP Code</h4>
               <p className="text-xs text-zinc-500">Please enter the 6-digit code sent to the admin/user.</p>
             </div>

             <input 
               type="text" 
               maxLength={6}
               required
               placeholder="000000"
               value={otpCode}
               onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))} // รับเฉพาะตัวเลข
               className="w-full h-14 text-center text-2xl tracking-[0.5em] font-mono font-bold bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all"
               autoFocus
             />

             <button type="submit" className="w-full h-11 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 flex items-center justify-center gap-2 mt-2">
                Verify & Continue <ArrowRight size={18} />
             </button>
          </form>
        )}

        {/* STEP 2: New Password Input */}
        {step === 2 && (
          <form onSubmit={handlePreSubmitPassword} className="flex flex-col gap-4">
             <div className="text-center mb-2">
               <h4 className="text-zinc-900 font-bold">Set New Password</h4>
               <p className="text-xs text-zinc-500">Enter the new password for this account.</p>
             </div>

             <div className="space-y-3">
               <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">New Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"/>
                    <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full h-11 pl-10 pr-4 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-zinc-900 outline-none" placeholder="••••••••" />
                  </div>
               </div>
               <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Confirm Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"/>
                    <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full h-11 pl-10 pr-4 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-zinc-900 outline-none" placeholder="••••••••" />
                  </div>
               </div>
             </div>

             <button type="submit" className="w-full h-11 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 flex items-center justify-center gap-2 mt-4">
                Next Step <ArrowRight size={18} />
             </button>
          </form>
        )}

        {/* STEP 3: Final Confirmation */}
        {step === 3 && (
           <div className="flex flex-col gap-4">
             <div className="p-4 bg-red-50 text-red-800 rounded-xl border border-red-100 flex flex-col items-center text-center gap-2">
               <AlertTriangle size={32} />
               <div>
                 <p className="font-bold">Confirm Password Reset?</p>
                 <p className="text-xs mt-1 opacity-80">
                   This will overwrite the user's current password immediately. The OTP will be validated at this stage.
                 </p>
               </div>
             </div>
             
             <div className="flex gap-3 mt-2">
               <button onClick={() => setStep(2)} disabled={loading} className="flex-1 h-11 bg-zinc-100 text-zinc-600 font-semibold rounded-xl hover:bg-zinc-200 transition-all">
                 Back
               </button>
               <button onClick={handleFinalSubmit} disabled={loading} className="flex-1 h-11 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-100">
                 {loading ? <Loader2 size={18} className="animate-spin"/> : 'Confirm Reset'}
               </button>
             </div>
           </div>
        )}

        {/* Stepper Dots (Visual Indicator) */}
        <div className="flex justify-center gap-2 mt-6">
          {[0, 1, 2, 3].map((s) => (
            <div key={s} className={`w-2 h-2 rounded-full transition-all ${step === s ? 'bg-zinc-900 w-4' : step > s ? 'bg-zinc-300' : 'bg-zinc-100'}`} />
          ))}
        </div>

      </div>
    </div>,
    document.body
  );
};

// --- EDIT USER MODAL ---
const EditUserModal = ({ isOpen, onClose, user, onSuccess }) => {
  const { showToast } = useToast();
  
  const [initialData, setInitialData] = useState({ name: '', email: '', role: '' });
  const [formData, setFormData] = useState({ name: '', email: '', role: '' });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      const data = {
        name: user.name,
        email: user.email,
        role: user.role
      };
      setInitialData(data);
      setFormData(data);
    }
  }, [user, isOpen]);

  const isDirty = useMemo(() => {
    return (
      formData.name !== initialData.name ||
      formData.email !== initialData.email ||
      formData.role !== initialData.role
    );
  }, [formData, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isDirty) return;

    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      await request(`/api/auth/admin/users/${user.staffId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          role: formData.role
        })
      });
      
      showToast("User updated successfully", "success");
      onSuccess();
      onClose();
    } catch (error) {
      showToast(error.message || "Failed to update user", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md p-6 rounded-2xl shadow-2xl border border-zinc-100 flex flex-col gap-6 animate-in zoom-in-95 duration-200">
        
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-zinc-900">Edit User Profile</h3>
            <p className="text-sm text-zinc-500">Update account information.</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-900 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Read-Only: Staff ID */}
          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="p-2 bg-white rounded-lg shadow-sm text-zinc-400">
                 <User size={16} />
               </div>
               <div>
                 <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Staff ID</p>
                 <p className="text-sm font-bold text-zinc-700 font-mono">{user?.staffId}</p>
               </div>
             </div>
             <span className="text-xs font-medium text-zinc-400 bg-zinc-200/50 px-2 py-1 rounded">Read-only</span>
          </div>

          {/* Editable Fields */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Full Name</label>
              <input 
                required 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                className="w-full h-10 px-3 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Email</label>
              <input 
                type="email" 
                required 
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})} 
                className="w-full h-10 px-3 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Role</label>
              {/* ✅ เปลี่ยนเป็น Input Text ปกติ */}
              <input 
                type="text"
                required 
                placeholder="Ex. Admin, User, Manager"
                value={formData.role} 
                onChange={e => setFormData({...formData, role: e.target.value})} 
                className="w-full h-10 px-3 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all"
              />
            </div>
          </div>

          {/* Read-Only: Force Password Change Status (Blocked) */}
          <div className="pt-2 opacity-60 pointer-events-none select-none">
             <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="flex items-center gap-2">
                   <RotateCcw size={16} className={user?.isForceChangePassword ? "text-orange-500" : "text-zinc-400"}/>
                   <span className="text-sm font-medium text-zinc-500">Force Password Change</span>
                </div>
                <label className="relative inline-flex items-center">
                  <input type="checkbox" checked={user?.isForceChangePassword || false} readOnly disabled className="sr-only peer" />
                  <div className="w-9 h-5 bg-zinc-200 rounded-full peer peer-checked:bg-orange-400 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                </label>
             </div>
             <p className="text-[10px] text-zinc-400 mt-1 text-center">Authentication settings cannot be changed here.</p>
          </div>

          <button 
            disabled={!isDirty || isSubmitting} 
            className="w-full h-11 bg-zinc-900 text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} 
            Save Changes
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};

// --- MAIN PAGE (UserManagement) ---
// ส่วนนี้เหมือนเดิมครับ
export default function UserManagement() {
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [editingUser, setEditingUser] = useState(null);
  const [resetPwdUser, setResetPwdUser] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await request('/api/auth/admin/users');
      setUsers(data || []);
    } catch (error) {
      showToast("Failed to fetch users", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.staffId.includes(searchQuery) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <EditUserModal 
        isOpen={!!editingUser} 
        user={editingUser} 
        onClose={() => setEditingUser(null)} 
        onSuccess={fetchUsers} 
      />
      {/* ✅ Reset Password Modal */}
      <AdminResetPasswordModal 
        isOpen={!!resetPwdUser}
        user={resetPwdUser}
        onClose={() => setResetPwdUser(null)}
      />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <Users className="text-zinc-900" size={24}/> User Management
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Manage system accounts and permissions.</p>
        </div>
        <div className="relative w-full md:w-64">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16}/>
           <input 
             type="text" 
             placeholder="Search user..." 
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="w-full h-10 pl-9 pr-4 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-100"
           />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50/50 border-b border-zinc-100 text-xs uppercase text-zinc-500 font-semibold">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined Date</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {loading ? (
                 [...Array(3)].map((_,i) => <tr key={i}><td colSpan="5" className="p-6"><div className="h-4 bg-zinc-100 rounded animate-pulse"/></td></tr>)
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.staffId} className="group hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 font-bold border border-zinc-200">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-900">{user.name}</p>
                          <p className="text-xs text-zinc-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${user.role === 'SuperAdmin' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>
                        {user.role === 'SuperAdmin' && <Shield size={12}/>}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                       {user.isForceChangePassword ? (
                         <span className="inline-flex items-center gap-1 text-orange-600 text-xs bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                           <RotateCcw size={10}/> Reset Required
                         </span>
                       ) : (
                         <span className="inline-flex items-center gap-1 text-emerald-600 text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                           <CheckCircle size={10}/> Active
                         </span>
                       )}
                    </td>
                    <td className="px-6 py-4 text-zinc-500 font-mono text-xs">
                      {new Date(user.createdAt).toLocaleDateString('th-TH')}
                    </td>
                    <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setResetPwdUser(user)}
                          className="p-2 text-zinc-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all border border-transparent"
                          title="Reset Password"
                        >
                          <KeyRound size={16}/>
                        </button>
                      <button 
                        onClick={() => setEditingUser(user)}
                        className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-white rounded-lg transition-all border border-transparent hover:border-zinc-200 hover:shadow-sm"
                      >
                        <Edit3 size={16}/>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" className="p-12 text-center text-zinc-400">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}