import { useState, useEffect, useMemo } from 'react';
import { 
  Search, FileClock, Filter, User, ArrowRight, RotateCcw, History, ChevronLeft, ChevronRight
} from 'lucide-react';
import { request } from '../utils/fetchUtils';
import { useToast } from '../context/ToastContext';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility Helper
function cn(...inputs) { return twMerge(clsx(inputs)); }

export default function AuditLog() {
  const { showToast } = useToast();
  
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFiltered, setIsFiltered] = useState(false);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Preset Default = 10

  const fetchLogs = async (code = '') => {
    setLoading(true);
    try {
      const endpoint = code 
        ? `/api/auditlogs/${encodeURIComponent(code)}` 
        : '/api/auditlogs';
      const data = await request(endpoint);
      setLogs(data || []);
      setIsFiltered(!!code);
      setCurrentPage(1); // รีเซ็ตหน้ากลับไปหน้าแรกเมื่อค้นหาใหม่
    } catch (error) {
      console.error(error);
      showToast("ดึงข้อมูลบันทึกระบบไม่สำเร็จ", "error");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) { fetchLogs(''); return; }
    fetchLogs(searchQuery);
  };

  const handleReset = () => { setSearchQuery(''); fetchLogs(''); };

  const getActionColor = (action) => {
    const act = action.toUpperCase();
    if (act.includes('STOCK_IN') || act.includes('ADD')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (act.includes('STOCK_OUT') || act.includes('WITHDRAW')) return 'bg-amber-100 text-amber-700 border-amber-200';
    if (act.includes('DELETE')) return 'bg-red-100 text-red-700 border-red-200';
    if (act.includes('UPDATE') || act.includes('EDIT')) return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-zinc-100 text-zinc-600 border-zinc-200';
  };

  // --- Logic สำหรับ Pagination ---
  const processedLogs = useMemo(() => {
    if (!logs) return { paginated: [], totalPages: 0 };
    
    // คำนวณ index เริ่มต้นและสิ้นสุดของหน้าปัจจุบัน
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    
    // ตัดเอาเฉพาะข้อมูลในหน้านั้นๆ
    const currentItems = logs.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(logs.length / itemsPerPage);

    return { paginated: currentItems, totalPages };
  }, [logs, currentPage, itemsPerPage]);

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4 md:px-8 space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-6">
        <div>
          <div className="flex items-center gap-2 text-zinc-900 mb-1">
            <div className="p-2 bg-zinc-100 rounded-lg"><History size={24} /></div>
            <h1 className="text-2xl font-bold tracking-tight">บันทึกการทำงานของระบบ</h1>
          </div>
          <p className="text-zinc-500 text-sm">ประวัติกิจกรรมและการเคลื่อนไหวของระบบ</p>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm flex gap-2 items-center">
        <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input 
              type="text" 
              placeholder="ค้นหาด้วยรหัสอุปกรณ์..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 transition-all"
            />
          </div>
          <button type="submit" className="h-10 px-4 bg-zinc-900 text-white rounded-lg text-sm font-bold hover:bg-zinc-800 transition-colors shadow-sm flex items-center gap-2 active:scale-95">
            <Filter size={14} /> ค้นหา
          </button>
          {isFiltered && (
            <button type="button" onClick={handleReset} className="h-10 w-10 flex items-center justify-center bg-white border border-zinc-200 text-zinc-500 rounded-lg hover:bg-zinc-50 hover:text-zinc-900 transition-colors shadow-sm active:scale-95" title="รีเซ็ต">
              <RotateCcw size={16} />
            </button>
          )}
        </form>
        <div className="text-xs text-zinc-400 font-medium px-2 border-l border-zinc-100 pl-4 hidden sm:block">
          พบ {logs.length} รายการ
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-zinc-50/80 border-b border-zinc-200 text-[11px] uppercase tracking-wider text-zinc-500 font-bold sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 w-[160px] whitespace-nowrap">วันเวลา</th>
                <th className="px-6 py-4 w-[140px] whitespace-nowrap">รหัสอุปกรณ์</th>
                <th className="px-6 py-4 w-[150px] whitespace-nowrap">การกระทำ</th>
                <th className="px-6 py-4 w-[100px] text-center whitespace-nowrap">การเปลี่ยนแปลง</th>
                <th className="px-6 py-4 min-w-[300px]">รายละเอียด (เดิม → ใหม่)</th>
                <th className="px-6 py-4 w-[140px] text-right whitespace-nowrap">ผู้ทำรายการ</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-zinc-50">
              {loading ? (
                 [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan="6" className="px-6 py-4"><div className="h-6 bg-zinc-100 rounded w-full animate-pulse"></div></td></tr>
                ))
              ) : processedLogs.paginated.length > 0 ? (
                processedLogs.paginated.map((log) => (
                  <tr key={log.id} className="group hover:bg-zinc-50/80 transition-colors">
                    
                    {/* Timestamp */}
                    <td className="px-6 py-3.5 text-zinc-500 text-[11px] whitespace-nowrap font-mono font-medium">
                      {log.createdAt}
                    </td>

                    {/* Item Code */}
                    <td className="px-6 py-3.5">
                      <span className="font-mono font-bold text-zinc-700 bg-zinc-100 px-2 py-1 rounded border border-zinc-200 text-xs shadow-sm">
                        {log.recordId}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-6 py-3.5">
                      <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border tracking-wide whitespace-nowrap shadow-sm", getActionColor(log.action))}>
                        {log.action.split(' ')[0]}
                      </span>
                    </td>

                    {/* Movement (+/-) */}
                    <td className="px-6 py-3.5 text-center">
                       {log.receive !== "+0" && log.receive !== "0" ? (
                         <span className="text-emerald-600 font-extrabold text-xs bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100 shadow-sm">
                           {log.receive}
                         </span>
                       ) : log.withdraw !== "+0" && log.withdraw !== "0" ? (
                         <span className="text-amber-600 font-extrabold text-xs bg-amber-50 px-2.5 py-1 rounded-md border border-amber-100 shadow-sm">
                           {log.withdraw.replace('+', '')}
                         </span>
                       ) : (
                         <span className="text-zinc-300 font-bold">-</span>
                       )}
                    </td>

                    {/* Detail (Old -> New) */}
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2 text-xs flex-wrap">
                        <span className="text-zinc-400 line-through decoration-zinc-300 font-medium">
                          {log.oldValue.replace('Balance: ', '')}
                        </span>
                        <ArrowRight size={12} className="text-zinc-300 shrink-0" />
                        <span className="text-zinc-900 font-bold bg-white px-2 py-1 rounded-md border border-zinc-200 shadow-sm">
                          {log.newValue.replace('Balance: ', '')}
                        </span>
                      </div>
                    </td>

                    {/* User */}
                    <td className="px-6 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-zinc-700 font-bold text-[11px]">{log.createdBy}</span>
                        <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 border border-zinc-200 shrink-0">
                          <User size={12} />
                        </div>
                      </div>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center justify-center text-zinc-400">
                      <FileClock size={40} strokeWidth={1.5} className="mb-3 opacity-30"/>
                      <p className="text-zinc-500 font-bold text-sm">ไม่พบประวัติการทำรายการ</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS */}
        <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span className="font-medium">จำนวนแถว:</span>
            <select 
              value={itemsPerPage} 
              onChange={(e) => { 
                setItemsPerPage(Number(e.target.value)); 
                setCurrentPage(1); 
              }} 
              className="bg-white border border-zinc-200 rounded-lg px-2 py-1 text-sm font-bold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 cursor-pointer shadow-sm"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-500">หน้า <span className="font-bold text-zinc-900">{currentPage}</span> จาก <span className="font-bold text-zinc-900">{processedLogs.totalPages || 1}</span></span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1 || loading} 
                className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 bg-white hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(processedLogs.totalPages, p + 1))} 
                disabled={currentPage >= processedLogs.totalPages || processedLogs.totalPages === 0 || loading} 
                className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 bg-white hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
              >
                <ChevronRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}