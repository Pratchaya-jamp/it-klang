import { useState, useEffect, useMemo } from 'react';
import { Loader2, Package, ArrowDownRight, Calendar, Filter, BarChart2, LineChart } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) { return twMerge(clsx(inputs)); }

// --- 1. กราฟหลอด (Horizontal Bar Chart) ---
const TailwindBarChart = ({ data, categoryKey, valueKey, barColorClass, emptyMessage }) => {
  const maxVal = useMemo(() => Math.max(...data.map(d => Number(d[valueKey]) || 0), 1), [data, valueKey]);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-zinc-400">
        <Filter size={32} className="opacity-30 mb-2" />
        <p className="text-sm font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2 animate-in fade-in duration-300">
      {data.map((item, i) => {
        const val = Number(item[valueKey]) || 0;
        const pct = (val / maxVal) * 100;
        return (
          <div key={i} className="flex flex-col gap-1.5 group">
            <div className="flex justify-between text-xs font-medium text-zinc-700">
              <span className="group-hover:text-zinc-900 transition-colors truncate pr-4">{item[categoryKey]}</span>
              <span className="font-bold">{val.toLocaleString()}</span>
            </div>
            <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all duration-700 ease-out", barColorClass)} 
                style={{ width: `${pct}%` }}
              ></div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// --- 2. กราฟเส้น (Line Chart SVG) แบบโชว์ตัวเลขเสมอ ---
const TailwindLineChart = ({ data, categoryKey, valueKey, textColorClass, emptyMessage }) => {
  // เผื่อพื้นที่ด้านบน 15% เพื่อไม่ให้ตัวเลขชนขอบกราฟด้านบน
  const maxVal = useMemo(() => Math.ceil(Math.max(...data.map(d => Number(d[valueKey]) || 0), 1) * 1.15), [data, valueKey]);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-zinc-400">
        <Filter size={32} className="opacity-30 mb-2" />
        <p className="text-sm font-medium">{emptyMessage}</p>
      </div>
    );
  }

  // คำนวณพิกัด (X, Y) สำหรับแต่ละจุดในกราฟ (เป็นเปอร์เซ็นต์)
  const points = data.map((item, i) => {
    const x = data.length > 1 ? (i / (data.length - 1)) * 100 : 50;
    const y = 100 - ((Number(item[valueKey]) || 0) / maxVal) * 100;
    return { x, y, item, val: Number(item[valueKey]) || 0 };
  });

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className={cn("flex h-full min-h-[300px] w-full pt-8 pb-8 px-2 animate-in fade-in duration-300", textColorClass)}>
      
      {/* แกน Y (สเกลแนวตั้ง) */}
      <div className="flex flex-col justify-between items-end pr-3 text-[10px] text-zinc-400 font-medium h-full shrink-0 pb-1">
        <span>{maxVal.toLocaleString()}</span>
        <span>{Math.round(maxVal / 2).toLocaleString()}</span>
        <span>0</span>
      </div>

      <div className="relative flex-1 w-full flex flex-col h-full">
        {/* พื้นที่วาด SVG */}
        <div className="relative flex-1 w-full">
          <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* เส้น Grid แนวนอน */}
            <line x1="0" y1="0" x2="100" y2="0" stroke="#f4f4f5" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeDasharray="4 4" />
            <line x1="0" y1="50" x2="100" y2="50" stroke="#f4f4f5" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeDasharray="4 4" />
            <line x1="0" y1="100" x2="100" y2="100" stroke="#e4e4e7" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            
            {/* เส้นกราฟ */}
            <polyline 
              points={polylinePoints}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              vectorEffect="non-scaling-stroke"
              className="drop-shadow-sm transition-all duration-500 ease-in-out"
            />
          </svg>
          
          {/* จุด (Dots) และ ตัวเลขกำกับที่แสดงผลตลอดเวลา */}
          {points.map((p, i) => (
            <div key={i} className="absolute" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
              {/* ป้ายบอกจำนวน */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-md text-[11px] font-extrabold text-zinc-800 shadow-sm border border-zinc-200/60 z-10 transition-transform hover:scale-110">
                {p.val.toLocaleString()}
              </div>
              {/* จุดวงกลม */}
              <div 
                className="absolute w-3 h-3 -ml-[6px] -mt-[6px] rounded-full bg-white border-[3px] shadow-sm z-0"
                style={{ borderColor: 'currentColor' }}
              ></div>
            </div>
          ))}
        </div>
        
        {/* แกน X (หมวดหมู่) ด้านล่างสุด */}
        <div className="relative w-full h-6 mt-3">
          {points.map((p, i) => (
            <div 
              key={i} 
              className="absolute text-[10px] text-zinc-500 font-medium truncate w-[60px] text-center" 
              style={{ 
                left: `${p.x}%`,
                transform: points.length > 6 ? 'translateX(-50%) rotate(-25deg)' : 'translateX(-50%)', 
                transformOrigin: 'top center' 
              }}
              title={p.item[categoryKey]}
            >
              {p.item[categoryKey]}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


// --- MAIN DASHBOARD WIDGET ---
export default function InventoryStats() {
  // --- STATES ---
  const [balanceData, setBalanceData] = useState([]);
  const [withdrawData, setWithdrawData] = useState([]);
  
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [loadingWithdraw, setLoadingWithdraw] = useState(false);

  // States สำหรับสลับกราฟ (bar | line)
  const [balanceChartType, setBalanceChartType] = useState('bar');
  const [withdrawChartType, setWithdrawChartType] = useState('bar');

  // Filter States สำหรับกราฟยอดเบิก
  const [filterMode, setFilterMode] = useState('30'); // '7' | '30' | '365' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // --- FETCH FUNCTIONS ---
  const fetchBalances = async () => {
    setLoadingBalance(true);
    try {
      const res = await fetch('/api/stocks/charts/balances');
      if (!res.ok) throw new Error();
      const json = await res.json();
      setBalanceData(Array.isArray(json) ? json : []);
    } catch (err) {
      console.error("Failed to fetch balances", err);
      setBalanceData([]);
    } finally {
      setLoadingBalance(false);
    }
  };

  const fetchWithdrawals = async () => {
    setLoadingWithdraw(true);
    try {
      let query = '';
      if (filterMode !== 'custom') {
        query = `?days=${filterMode}`;
      } else {
        if (!startDate || !endDate) {
          setLoadingWithdraw(false);
          return;
        }
        query = `?startDate=${startDate}&endDate=${endDate}`;
      }
      
      const res = await fetch(`/api/stocks/charts/withdrawals${query}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setWithdrawData(Array.isArray(json) ? json : []);
    } catch (err) {
      console.error("Failed to fetch withdrawals", err);
      setWithdrawData([]);
    } finally {
      setLoadingWithdraw(false);
    }
  };

  // --- EFFECTS ---
  useEffect(() => {
    fetchBalances();
  }, []);

  useEffect(() => {
    if (filterMode !== 'custom') {
      fetchWithdrawals();
    }
  }, [filterMode]);


  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* =========================================
          1. กราฟยอดคงเหลือ
      ========================================= */}
      <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6 flex flex-col h-full min-h-[400px]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Package size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900">ยอดคงเหลือตามหมวดหมู่</h2>
              <p className="text-xs text-zinc-500">แสดงยอดสินทรัพย์รวมแบบเรียลไทม์</p>
            </div>
          </div>
          
          {/* Toggle Button สำหรับกราฟยอดคงเหลือ */}
          <div className="flex bg-zinc-100 p-1 rounded-lg border border-zinc-200">
            <button 
              onClick={() => setBalanceChartType('bar')}
              className={cn("p-1.5 rounded-md transition-all", balanceChartType === 'bar' ? "bg-white text-emerald-600 shadow-sm" : "text-zinc-400 hover:text-zinc-600")}
              title="แบบหลอด"
            >
              <BarChart2 size={16} />
            </button>
            <button 
              onClick={() => setBalanceChartType('line')}
              className={cn("p-1.5 rounded-md transition-all", balanceChartType === 'line' ? "bg-white text-emerald-600 shadow-sm" : "text-zinc-400 hover:text-zinc-600")}
              title="แบบเส้น"
            >
              <LineChart size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-[300px] border border-zinc-100 rounded-xl bg-zinc-50/50 p-4">
          {loadingBalance ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400">
              <Loader2 className="animate-spin mb-2" size={24} />
              <span className="text-xs">กำลังโหลดข้อมูล...</span>
            </div>
          ) : (
            balanceChartType === 'bar' ? (
              <TailwindBarChart 
                data={balanceData} 
                categoryKey="category" 
                valueKey="totalBalance" 
                barColorClass="bg-emerald-500" 
                emptyMessage="ไม่มีข้อมูลยอดคงเหลือในคลัง"
              />
            ) : (
              <TailwindLineChart 
                data={balanceData} 
                categoryKey="category" 
                valueKey="totalBalance" 
                textColorClass="text-emerald-500" 
                emptyMessage="ไม่มีข้อมูลยอดคงเหลือในคลัง"
              />
            )
          )}
        </div>
      </div>


      {/* =========================================
          2. กราฟยอดเบิกออก
      ========================================= */}
      <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6 flex flex-col h-full min-h-[400px]">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <ArrowDownRight size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900">ยอดเบิกออกตามหมวดหมู่</h2>
              <p className="text-xs text-zinc-500">ความถี่ในการทำรายการเบิกจ่าย</p>
            </div>
          </div>

          {/* Toggle Button สำหรับกราฟเบิกออก */}
          <div className="flex bg-zinc-100 p-1 rounded-lg border border-zinc-200 shrink-0">
            <button 
              onClick={() => setWithdrawChartType('bar')}
              className={cn("p-1.5 rounded-md transition-all", withdrawChartType === 'bar' ? "bg-white text-amber-600 shadow-sm" : "text-zinc-400 hover:text-zinc-600")}
              title="แบบหลอด"
            >
              <BarChart2 size={16} />
            </button>
            <button 
              onClick={() => setWithdrawChartType('line')}
              className={cn("p-1.5 rounded-md transition-all", withdrawChartType === 'line' ? "bg-white text-amber-600 shadow-sm" : "text-zinc-400 hover:text-zinc-600")}
              title="แบบเส้น"
            >
              <LineChart size={16} />
            </button>
          </div>
        </div>

        {/* Toolbar สำหรับ Filter */}
        <div className="flex flex-col lg:flex-row gap-3 mb-4 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
          <div className="flex bg-zinc-200/60 p-1 rounded-lg shrink-0 w-fit">
            {[
              { label: '7 วัน', value: '7' },
              { label: '30 วัน', value: '30' },
              { label: '1 ปี', value: '365' },
              { label: 'กำหนดเอง', value: 'custom' },
            ].map(opt => (
              <button 
                key={opt.value}
                onClick={() => setFilterMode(opt.value)}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap",
                  filterMode === opt.value ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {filterMode === 'custom' && (
            <div className="flex items-center gap-2 flex-wrap animate-in fade-in slide-in-from-left-2 duration-300">
              <div className="flex items-center gap-2">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-8 px-2 border border-zinc-200 rounded-md text-xs font-medium text-zinc-600 outline-none focus:ring-2 focus:ring-zinc-900/10" />
                <span className="text-zinc-400 text-xs">-</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-8 px-2 border border-zinc-200 rounded-md text-xs font-medium text-zinc-600 outline-none focus:ring-2 focus:ring-zinc-900/10" />
              </div>
              <button 
                onClick={fetchWithdrawals} 
                disabled={!startDate || !endDate || loadingWithdraw}
                className="h-8 px-3 bg-zinc-900 text-white rounded-md text-xs font-bold disabled:opacity-50 hover:bg-zinc-800 transition-colors shadow-sm active:scale-95 flex items-center justify-center min-w-[60px]"
              >
                {loadingWithdraw ? <Loader2 size={14} className="animate-spin" /> : 'ค้นหา'}
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-[250px] border border-zinc-100 rounded-xl p-4">
          {loadingWithdraw ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400">
              <Loader2 className="animate-spin mb-2" size={24} />
              <span className="text-xs">กำลังโหลดข้อมูล...</span>
            </div>
          ) : (
            withdrawChartType === 'bar' ? (
              <TailwindBarChart 
                data={withdrawData} 
                categoryKey="category" 
                valueKey="totalWithdrawn" 
                barColorClass="bg-amber-500" 
                emptyMessage="ไม่พบรายการเบิกออกในช่วงเวลานี้"
              />
            ) : (
              <TailwindLineChart 
                data={withdrawData} 
                categoryKey="category" 
                valueKey="totalWithdrawn" 
                textColorClass="text-amber-500" 
                emptyMessage="ไม่พบรายการเบิกออกในช่วงเวลานี้"
              />
            )
          )}
        </div>
      </div>

    </div>
  );
}