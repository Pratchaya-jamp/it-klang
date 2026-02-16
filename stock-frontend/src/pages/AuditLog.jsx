import { useState, useEffect } from 'react';
import { 
  Search, FileClock, Filter, User, Calendar, 
  ArrowRight, ArrowUpRight, ArrowDownLeft, RotateCcw, 
  Database, History
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

  const fetchLogs = async (code = '') => {
    setLoading(true);
    try {
      const endpoint = code 
        ? `/api/auditlogs/${encodeURIComponent(code)}` 
        : '/api/auditlogs';
      const data = await request(endpoint);
      setLogs(data || []);
      setIsFiltered(!!code);
    } catch (error) {
      console.error(error);
      showToast("Failed to load audit logs", "error");
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

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4 md:px-8 space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-6">
        <div>
          <div className="flex items-center gap-2 text-zinc-900 mb-1">
            <div className="p-2 bg-zinc-100 rounded-lg"><History size={24} /></div>
            <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
          </div>
          <p className="text-zinc-500 text-sm">System activity and movement history.</p>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm flex gap-2 items-center">
        <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input 
              type="text" 
              placeholder="Filter by Item Code..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 transition-all"
            />
          </div>
          <button type="submit" className="h-10 px-4 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors shadow-sm flex items-center gap-2">
            <Filter size={14} /> Search
          </button>
          {isFiltered && (
            <button type="button" onClick={handleReset} className="h-10 w-10 flex items-center justify-center bg-white border border-zinc-200 text-zinc-500 rounded-lg hover:bg-zinc-50 hover:text-zinc-900 transition-colors">
              <RotateCcw size={16} />
            </button>
          )}
        </form>
        <div className="text-xs text-zinc-400 font-medium px-2 border-l border-zinc-100 pl-4 hidden sm:block">
          {logs.length} Records found
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-zinc-50/80 border-b border-zinc-200 text-xs uppercase text-zinc-500 font-semibold sticky top-0 z-10">
              <tr>
                {/* 1. Date & Time (Fixed Width) */}
                <th className="px-4 py-3 w-[160px] whitespace-nowrap">Timestamp</th>
                
                {/* 2. Item Code (Fixed Width) */}
                <th className="px-4 py-3 w-[140px] whitespace-nowrap">Item Code</th>

                {/* 3. Action (Fixed Width) */}
                <th className="px-4 py-3 w-[150px] whitespace-nowrap">Action</th>

                {/* 4. Movement (Fixed Width) */}
                <th className="px-4 py-3 w-[100px] text-center whitespace-nowrap">Change</th>

                {/* 5. Detail (Fluid - กินพื้นที่ที่เหลือ) */}
                <th className="px-4 py-3 min-w-[300px]">Detail (Old → New)</th>

                {/* 6. User (Fixed Width) */}
                <th className="px-4 py-3 w-[140px] text-right whitespace-nowrap">User</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-zinc-100">
              {loading ? (
                 [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan="6" className="px-4 py-4"><div className="h-4 bg-zinc-100 rounded w-full animate-pulse"></div></td></tr>
                ))
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="group hover:bg-zinc-50 transition-colors">
                    
                    {/* Timestamp */}
                    <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap font-mono">
                      {log.createdAt}
                    </td>

                    {/* Item Code */}
                    <td className="px-4 py-3">
                      <span className="font-mono font-medium text-zinc-700 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-200 text-xs">
                        {log.recordId}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border tracking-wide whitespace-nowrap", getActionColor(log.action))}>
                        {log.action.split(' ')[0]} {/* ตัดเอาแค่คำแรก เช่น STOCK_IN */}
                      </span>
                    </td>

                    {/* Movement (+/-) */}
                    <td className="px-4 py-3 text-center">
                       {log.receive !== "+0" && log.receive !== "0" ? (
                         <span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                           {log.receive}
                         </span>
                       ) : log.withdraw !== "+0" && log.withdraw !== "0" ? (
                         <span className="text-amber-600 font-bold text-xs bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                           -{log.withdraw.replace('+', '')}
                         </span>
                       ) : (
                         <span className="text-zinc-300">-</span>
                       )}
                    </td>

                    {/* Detail (Old -> New) */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-xs flex-wrap">
                        <span className="text-zinc-500 line-through decoration-zinc-300">
                          {log.oldValue.replace('Balance: ', '')}
                        </span>
                        <ArrowRight size={12} className="text-zinc-400 shrink-0" />
                        <span className="text-zinc-900 font-semibold bg-white px-1.5 py-0.5 rounded border border-zinc-200 shadow-sm">
                          {log.newValue.replace('Balance: ', '')}
                        </span>
                        {/* Table Name Badge (Optional) */}
                      </div>
                    </td>

                    {/* User */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-zinc-700 font-medium text-xs">{log.createdBy}</span>
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
                      <FileClock size={48} strokeWidth={1} className="mb-3 opacity-20"/>
                      <p className="text-zinc-900 font-medium">No logs found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}