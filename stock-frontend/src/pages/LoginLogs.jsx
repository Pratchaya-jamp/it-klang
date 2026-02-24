import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, Search, ShieldAlert, Monitor, Globe, Clock, 
  CheckCircle2, XCircle, Loader2, RefreshCw 
} from 'lucide-react';
import { request } from '../utils/fetchUtils';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function LoginLogs() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchStaffId, setSearchStaffId] = useState('');

  // 🔒 Security Check: ให้เฉพาะ SuperAdmin เข้าได้
  useEffect(() => {
    const role = user?.role || user?.data?.role;
    if (role !== 'SuperAdmin') {
      showToast("Access Denied: SuperAdmin privileges required.", "error");
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // ฟังก์ชันดึงข้อมูล (รองรับทั้งแบบดึงทั้งหมด และ ดึงตาม Staff ID)
  const fetchLogs = async (staffId = '') => {
    setLoading(true);
    try {
      // เลือก Endpoint ตามการค้นหา
      const endpoint = staffId 
        ? `/api/audit/login-logs/${staffId}` 
        : '/api/audit/login-logs';
        
      const data = await request(endpoint);
      setLogs(data || []);
    } catch (error) {
      showToast(error.message || "Failed to fetch access logs", "error");
    } finally {
      setLoading(false);
    }
  };

  // ดึงข้อมูลครั้งแรกเมื่อเปิดหน้า
  useEffect(() => {
    fetchLogs();
  }, []);

  // จัดการเมื่อกดค้นหา
  const handleSearch = (e) => {
    e.preventDefault();
    fetchLogs(searchStaffId.trim());
  };

  // จัดการเมื่อกดรีเฟรช (ล้างการค้นหาและดึงใหม่ทั้งหมด)
  const handleRefresh = () => {
    setSearchStaffId('');
    fetchLogs('');
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <Activity className="text-zinc-900" size={24}/> Access Logs
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Monitor system authentication and login activities.</p>
        </div>
        
        <form onSubmit={handleSearch} className="flex items-center gap-2 w-full md:w-auto">
           <div className="relative w-full md:w-64">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16}/>
             <input 
               type="text" 
               placeholder="Search by Staff ID..." 
               value={searchStaffId}
               onChange={(e) => setSearchStaffId(e.target.value)}
               className="w-full h-10 pl-9 pr-4 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all"
             />
           </div>
           <button 
             type="submit" 
             className="h-10 px-4 bg-zinc-900 text-white text-sm font-semibold rounded-xl hover:bg-zinc-800 transition-colors shadow-sm"
           >
             Search
           </button>
           <button 
             type="button" 
             onClick={handleRefresh}
             className="h-10 w-10 flex items-center justify-center bg-white border border-zinc-200 text-zinc-500 rounded-xl hover:bg-zinc-50 hover:text-zinc-900 transition-colors shadow-sm"
             title="Refresh Logs"
           >
             <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
           </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50/50 border-b border-zinc-100 text-xs uppercase text-zinc-500 font-semibold">
              <tr>
                <th className="px-6 py-4">Staff ID</th>
                <th className="px-6 py-4">Status & Action</th>
                <th className="px-6 py-4">IP Address</th>
                <th className="px-6 py-4">Device</th>
                <th className="px-6 py-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {loading ? (
                 [...Array(5)].map((_,i) => (
                   <tr key={i}><td colSpan="5" className="p-6"><div className="h-4 bg-zinc-100 rounded animate-pulse"/></td></tr>
                 ))
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="group hover:bg-zinc-50 transition-colors">
                    
                    {/* 1. Staff ID */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500 border border-zinc-200">
                           <ShieldAlert size={14} />
                        </div>
                        <p className="font-bold text-zinc-900 font-mono">{log.staffId}</p>
                      </div>
                    </td>

                    {/* 2. Status & Action */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          {log.status === 'Success' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 text-[11px] font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase tracking-wider">
                              <CheckCircle2 size={12}/> Success
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-700 text-[11px] font-bold bg-red-50 px-2 py-0.5 rounded border border-red-100 uppercase tracking-wider">
                              <XCircle size={12}/> {log.status}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-600 font-medium truncate max-w-[200px]" title={log.action}>
                          {log.action}
                        </p>
                        {log.note && <p className="text-[10px] text-zinc-400">{log.note}</p>}
                      </div>
                    </td>

                    {/* 3. IP Address */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-zinc-600">
                        <Globe size={14} className="text-zinc-400" />
                        <span className="font-mono text-xs">{log.ipAddress}</span>
                      </div>
                    </td>

                    {/* 4. Device */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-zinc-600">
                        <Monitor size={14} className="text-zinc-400" />
                        <span className="text-xs">{log.device}</span>
                      </div>
                    </td>

                    {/* 5. Timestamp */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="flex items-center gap-1.5 text-zinc-900 font-semibold text-xs">
                          <Clock size={12} className="text-zinc-400"/>
                          {log.timeAgo}
                        </div>
                        <p className="text-[10px] text-zinc-400 font-mono">
                          {new Date(log.timestamp).toLocaleString('th-TH')}
                        </p>
                      </div>
                    </td>

                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" className="p-12 text-center text-zinc-400">No login records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}