import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Mail, Loader2, Save, ArrowLeft, ChevronRight, Info
} from 'lucide-react';
import { request } from '../utils/fetchUtils';
import { useToast } from '../context/ToastContext';

export default function EditProfile() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // เก็บข้อมูลต้นฉบับจาก Server เพื่อใช้เปรียบเทียบ
  const [originalData, setOriginalData] = useState({ name: '', email: '' });
  // เก็บข้อมูลที่ User กำลังพิมพ์
  const [formData, setFormData] = useState({ name: '', email: '' });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await request('/api/auth/me'); // ดึงข้อมูลตัวเอง
        const { name, email } = response.data;
        const data = { name, email };
        setOriginalData(data);
        setFormData(data);
      } catch (error) {
        showToast("Failed to load profile", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // ✅ ตรวจสอบว่าข้อมูลมีการเปลี่ยนแปลงหรือไม่ (Dirty Check)
  // ปุ่มจะทำงานก็ต่อเมื่อข้อมูลใน formData ไม่เหมือนกับ originalData
  const isDirty = useMemo(() => {
    return formData.name !== originalData.name || formData.email !== originalData.email;
  }, [formData, originalData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isDirty) return;

    setIsSaving(true);
    try {
      // หน่วงเวลาจำลองการทำงานตามสไตล์ที่คุณชอบ
      await new Promise(resolve => setTimeout(resolve, 2000));

      await request('/api/auth/profile', {
        method: 'PUT', // หรือ POST ตาม Backend ของคุณ
        body: JSON.stringify(formData),
      });

      showToast("Profile updated successfully", "success");
      // อัปเดต originalData ให้เป็นค่าใหม่ที่เพิ่งบันทึกไป เพื่อให้ปุ่มกลับไป Disable
      setOriginalData(formData); 
      
      // หลังจาก 1.5 วิ ให้กลับไปหน้า Profile
      setTimeout(() => navigate('/profile'), 1500);
    } catch (error) {
      showToast(error.message || "Update failed", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 size={40} className="animate-spin text-zinc-300" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header & Back Button */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-500"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Edit Profile</h1>
            <p className="text-sm text-zinc-500">Update your personal information.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden p-8 space-y-6">
          
          {/* Name Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Full Name</label>
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-900 transition-colors">
                <User size={18} />
              </div>
              <input 
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter your name"
                className="w-full h-12 pl-10 pr-4 bg-zinc-50 border border-zinc-100 rounded-xl text-sm text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300 transition-all"
              />
            </div>
          </div>

          {/* Email Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Email Address</label>
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-900 transition-colors">
                <Mail size={18} />
              </div>
              <input 
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="user@example.com"
                className="w-full h-12 pl-10 pr-4 bg-zinc-50 border border-zinc-100 rounded-xl text-sm text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300 transition-all"
              />
            </div>
          </div>

          {/* Info Note */}
          <div className="flex gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
             <Info className="text-blue-500 shrink-0" size={18} />
             <p className="text-xs text-blue-700 leading-relaxed">
                For security reasons, Staff ID and Role cannot be changed by the user. 
                Please contact IT Support if these details are incorrect.
             </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
           <button 
             type="button"
             onClick={() => navigate(-1)}
             className="px-6 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
           >
             Cancel
           </button>
           <button 
             type="submit"
             // 🔒 บล็อคปุ่มถ้าไม่มีการแก้ไข (isDirty เป็น false) หรือกำลังบันทึก
             disabled={!isDirty || isSaving}
             className="flex items-center gap-2 px-8 py-2.5 bg-zinc-900 text-white text-sm font-semibold rounded-xl hover:bg-zinc-800 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed transition-all shadow-lg shadow-zinc-200"
           >
             {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
             Save Changes
           </button>
        </div>
      </form>
    </div>
  );
}