import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, Mail, IdCard, Calendar, Shield, Loader2, Edit3, Briefcase, Camera 
} from 'lucide-react';
import { request } from '../utils/fetchUtils';
import { useToast } from '../context/ToastContext';

export default function Profile() {
    const navigate = useNavigate();
  const { showToast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await request('/api/auth/me');
        setProfile(response.data);
      } catch (error) {
        console.error("Failed to load profile", error);
        showToast("Failed to load profile data", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-zinc-400">
        <Loader2 size={40} className="animate-spin mb-4 text-zinc-300" />
        <p className="text-sm font-medium">Loading profile...</p>
      </div>
    );
  }

  if (!profile) return null;

  // Format Date
  const joinDate = new Date(profile.createdAt).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Page Title */}
      <div className="mb-8 px-2">
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">My Profile</h1>
        <p className="text-sm text-zinc-500 mt-1">Manage your account information and security.</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
        
        {/* Banner Section */}
        <div className="h-40 bg-zinc-900 relative overflow-hidden group">
           {/* Noise Texture & Gradient */}
           <div className="absolute inset-0 opacity-30 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
           <div className="absolute -right-20 -top-20 w-96 h-96 bg-zinc-800 rounded-full blur-3xl opacity-50 group-hover:scale-110 transition-transform duration-700"></div>
        </div>

        <div className="px-6 md:px-10 pb-10">
          
          {/* Header Section: Avatar & Info */}
          <div className="flex flex-col sm:flex-row items-start gap-6 -mt-16 mb-8">
            
            {/* Avatar Circle (Overlapping Banner) */}
            <div className="relative shrink-0">
              <div className="w-32 h-32 rounded-full bg-white p-1.5 shadow-2xl ring-1 ring-zinc-100/50">
                <div className="w-full h-full rounded-full bg-zinc-50 flex items-center justify-center text-zinc-300 border border-zinc-200 overflow-hidden relative group cursor-pointer">
                  <User size={64} strokeWidth={1} />
                  {/* Hover Overlay for Picture Upload */}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={24} className="text-white" />
                  </div>
                </div>
              </div>
              {/* Status Dot */}
              <div className="absolute bottom-2 right-2 w-6 h-6 bg-emerald-500 border-4 border-white rounded-full" title="Active"></div>
            </div>

            {/* Name & Role (Pushed down to White Area) */}
            <div className="flex-1 pt-16 sm:pt-20 text-center sm:text-left space-y-1">
              <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">{profile.name}</h2>
              
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 shadow-sm">
                  <Briefcase size={12} className="text-zinc-400" />
                  {profile.role}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm">
                  Active Status
                </span>
              </div>
            </div>

            {/* Edit Button (Aligned Right) */}
            <div className="pt-0 sm:pt-20 w-full sm:w-auto">
              <button 
                  onClick={() => navigate('/profile/edit')} // 👈 เพิ่ม onClick ตรงนี้
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-zinc-900 text-white text-sm font-semibold rounded-xl hover:bg-zinc-800 active:scale-[0.98] transition-all shadow-lg shadow-zinc-200"
                >
                  <Edit3 size={16} /> 
                  Edit Profile
                </button>
            </div>
          </div>

          <hr className="border-zinc-100 mb-8" />

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Staff ID */}
            <div className="p-5 rounded-2xl bg-zinc-50/50 border border-zinc-100 hover:border-zinc-200 transition-colors flex items-center gap-5 group">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm text-zinc-500 border border-zinc-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                <IdCard size={24} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Staff ID</p>
                <p className="text-base font-bold text-zinc-900 font-mono tracking-wide">{profile.staffId}</p>
              </div>
            </div>

            {/* Email */}
            <div className="p-5 rounded-2xl bg-zinc-50/50 border border-zinc-100 hover:border-zinc-200 transition-colors flex items-center gap-5 group">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm text-zinc-500 border border-zinc-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Mail size={24} strokeWidth={1.5} />
              </div>
              <div className="overflow-hidden">
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Email Address</p>
                <p className="text-base font-bold text-zinc-900 truncate">{profile.email}</p>
              </div>
            </div>

            {/* Joined Date */}
            <div className="p-5 rounded-2xl bg-zinc-50/50 border border-zinc-100 hover:border-zinc-200 transition-colors flex items-center gap-5 group">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm text-zinc-500 border border-zinc-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Calendar size={24} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Joined Date</p>
                <p className="text-base font-bold text-zinc-900">{joinDate}</p>
              </div>
            </div>

            {/* Security */}
            <div className="p-5 rounded-2xl bg-zinc-50/50 border border-zinc-100 hover:border-zinc-200 transition-colors flex items-center gap-5 group">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm text-zinc-500 border border-zinc-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Shield size={24} strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Security</p>
                <div className="flex items-center justify-between">
                  <p className="text-base font-bold text-zinc-900">Password</p>
                  <Link to="/changepwd" state={{ staffId: profile.staffId }} className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline px-2 py-1 rounded hover:bg-blue-50 transition-colors">
                    Change Password
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}