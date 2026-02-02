import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, SlidersHorizontal, ChevronDown, Check, Plus, X, Trash2,
  Package, Layers, Scale, BarChart3, Clock, ArrowUp, ArrowDown, 
  ChevronLeft, ChevronRight 
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) { return twMerge(clsx(inputs)); }

// --- API SERVICE ---
const fetchItems = async (queryString) => {
  try {
    const response = await fetch(`/api/items/dashboard?${queryString}`);
    if (!response.ok) throw new Error(`API Error`);
    return await response.json();
  } catch (error) {
    return { data: [] };
  }
};

// --- SUB-COMPONENTS ---
const StatCard = ({ title, value, subtext, icon: Icon, highlight }) => (
  <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-zinc-200 transition-all duration-200 group">
    <div className="flex justify-between items-start mb-2">
      <div className={cn("p-2.5 rounded-xl transition-colors", highlight ? "bg-zinc-900 text-white" : "bg-zinc-50 text-zinc-600 group-hover:bg-zinc-100")}>
        <Icon size={20} strokeWidth={1.5} />
      </div>
    </div>
    <div>
      <h3 className="text-3xl font-semibold text-zinc-900 tracking-tight truncate" title={value}>{value}</h3>
      <p className="text-zinc-500 text-sm mt-1 font-light">{title}</p>
      {subtext && <p className="text-xs text-zinc-400 mt-2 font-light border-t border-zinc-50 pt-2">{subtext}</p>}
    </div>
  </div>
);

const CustomSelect = ({ label, value, onChange, options, placeholder = "Select..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative w-full mb-3 last:mb-0">
      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 bg-zinc-50 border border-transparent rounded-lg text-sm transition-all",
          "hover:bg-zinc-100", isOpen ? "bg-white border-zinc-300 ring-2 ring-zinc-50" : "",
          !value ? "text-zinc-400" : "text-zinc-900 font-medium"
        )}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown size={14} className={cn("transition-transform text-zinc-400", isOpen && "rotate-180")} />
      </button>
      {isOpen && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-zinc-100 rounded-lg shadow-xl max-h-48 overflow-auto animate-in fade-in zoom-in-95 duration-100">
          {options.map((opt) => (
            <div key={opt} onClick={() => { onChange(opt); setIsOpen(false); }} className={cn("px-3 py-2 text-sm cursor-pointer hover:bg-zinc-50", value === opt ? "bg-zinc-50 font-medium" : "")}>
              {opt} {value === opt && <Check size={14} className="float-right mt-1"/>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function Dashboard() {
  // Filter State
  const [searchId, setSearchId] = useState("");
  const [category, setCategory] = useState(""); 
  const [keyword, setKeyword] = useState("");   
  const [variant, setVariant] = useState("");   
  const [sortOrder, setSortOrder] = useState('asc');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Default 10

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const filterRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) setIsFilterOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchId) params.append('searchId', searchId);
      if (category) params.append('category', category);
      if (keyword) params.append('keyword', keyword);
      if (variant) params.append('variant', variant);

      const res = await fetchItems(params.toString());
      setData(res.data || []);
      setLoading(false);
      setCurrentPage(1); // Reset page when filter changes
    };
    const timeoutId = setTimeout(() => fetchData(), 500);
    return () => clearTimeout(timeoutId);
  }, [searchId, category, keyword, variant]);

  // --- SORTING & PAGINATION LOGIC ---
  const processedData = useMemo(() => {
    if (!data) return { all: [], paginated: [], totalPages: 0 };
    
    // 1. Sort
    const sorted = [...data].sort((a, b) => {
      return sortOrder === 'asc' 
        ? a.itemCode.localeCompare(b.itemCode) 
        : b.itemCode.localeCompare(a.itemCode);
    });

    // 2. Paginate
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = sorted.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(sorted.length / itemsPerPage);

    return { all: sorted, paginated: currentItems, totalPages, totalCount: sorted.length };
  }, [data, sortOrder, currentPage, itemsPerPage]);

  const toggleSort = () => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');

  // Stats Logic
  const stats = useMemo(() => {
    if (!data.length) return { total: 0, categories: 0, units: 0, topCategory: '-' };
    const total = data.length;
    const uniqueCategories = new Set(data.map(item => item.category)).size;
    const uniqueUnits = new Set(data.map(item => item.unit)).size;
    const categoryCounts = data.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {});
    const topCategory = Object.keys(categoryCounts).reduce((a, b) => categoryCounts[a] > categoryCounts[b] ? a : b, '-');
    const topCategoryPercent = Math.round((categoryCounts[topCategory] / total) * 100);
    return { total, categories: uniqueCategories, units: uniqueUnits, topCategory, topCategoryPercent };
  }, [data]);

  // Filter Handlers
  const handleCategoryChange = (val) => { setCategory(val); setKeyword(""); setVariant(""); };
  const clearAllFilters = () => { setCategory(""); setKeyword(""); setVariant(""); setIsFilterOpen(false); };
  const hasActiveFilters = category || keyword || variant;

  const renderSubFilters = () => {
    if (!category) return <div className="p-4 text-center text-xs text-zinc-400 bg-zinc-50 rounded-lg border border-dashed border-zinc-200">Select a category first</div>;
    if (['Mouse', 'Keyboard'].includes(category)) return <CustomSelect label="Connection" options={['USB', 'Wireless']} value={keyword} onChange={setKeyword} />;
    if (category === 'SSD') return <div className="space-y-3"><CustomSelect label="Interface" options={['SATA', 'M.2']} value={keyword} onChange={setKeyword} /><CustomSelect label="Capacity" options={['120GB', '240GB', '500GB', '1TB']} value={variant} onChange={setVariant} /></div>;
    if (category === 'RAM') return <div className="space-y-3"><CustomSelect label="Type" options={['DDR3', 'DDR4']} value={keyword} onChange={setKeyword} /><CustomSelect label="Capacity" options={['4GB', '8GB', '16GB']} value={variant} onChange={setVariant} /></div>;
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4 md:px-8 space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between py-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Dashboard</h1>
          <p className="text-zinc-500 text-sm font-light mt-1">Real-time inventory overview.</p>
        </div>
        <div className="hidden sm:flex text-sm text-zinc-400 font-light items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-zinc-100 shadow-sm">
           <Clock size={14}/> <span>Today</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Items" value={stats.total} subtext="Filtered items count" icon={Package} />
        <StatCard title="Active Categories" value={stats.categories} subtext="Product lines found" icon={Layers} />
        <StatCard title="Unit Types" value={stats.units} subtext="Distinct counting units" icon={Scale} />
        <StatCard title="Dominant Category" value={stats.topCategory} subtext={stats.total > 0 ? `${stats.topCategoryPercent}% of total inventory` : "No data available"} icon={BarChart3} highlight={true} />
      </div>

      <div className="h-px w-full bg-zinc-100"></div>

      {/* Table & Controls */}
      <div>
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center gap-3 w-full">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-800 transition-colors" size={18} />
              <input type="text" placeholder="Search by Item Code..." value={searchId} onChange={(e) => setSearchId(e.target.value)}
                className="w-full h-11 pl-10 pr-4 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-100 focus:border-zinc-300 transition-all shadow-sm"
              />
            </div>
            <div className="relative" ref={filterRef}>
              <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={cn("h-11 w-11 flex items-center justify-center rounded-xl border transition-all shadow-sm", isFilterOpen || hasActiveFilters ? "bg-zinc-900 border-zinc-900 text-white" : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50")}>
                <SlidersHorizontal size={18} strokeWidth={2} />
                {hasActiveFilters && !isFilterOpen && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>}
              </button>
              {isFilterOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-zinc-100 p-4 z-30 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex justify-between mb-4"><span className="text-sm font-semibold text-zinc-900">Filters</span>{hasActiveFilters && <button onClick={clearAllFilters} className="text-[10px] text-red-500 hover:underline flex items-center gap-1"><Trash2 size={10}/> Reset</button>}</div>
                  <div className="space-y-4"><CustomSelect label="Category" options={['Mouse', 'Keyboard', 'SSD', 'RAM', 'Flash Drive', 'Monitor']} value={category} onChange={handleCategoryChange} />
                  <div className="pt-2 border-t border-zinc-100">{renderSubFilters()}</div></div>
                </div>
              )}
            </div>
            <button className="h-11 px-5 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-sm shadow-zinc-200 active:scale-95">
              <Plus size={16} /> <span className="hidden sm:inline">New Item</span>
            </button>
          </div>

          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 animate-in slide-in-from-left-2 fade-in">
              <span className="text-xs text-zinc-400 font-medium mr-1">Active Filters:</span>
              {[category, keyword, variant].filter(Boolean).map((t) => (
                <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
                  {t} <button onClick={() => {if(t===category)setCategory("");if(t===keyword)setKeyword("");if(t===variant)setVariant("")}} className="hover:text-red-500 transition-colors"><X size={12}/></button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/30">
                  <th className="px-6 py-4 cursor-pointer hover:bg-zinc-50 transition-colors group/sort select-none" onClick={toggleSort}>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500 group-hover/sort:text-zinc-900">
                      Code
                      <div className="flex flex-col">{sortOrder === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>}</div>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400">Name</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400">Category</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-center">Unit</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {loading ? (
                  [...Array(5)].map((_, i) => <tr key={i} className="animate-pulse"><td colSpan="5" className="px-6 py-4"><div className="h-2 bg-zinc-100 rounded w-full"></div></td></tr>)
                ) : processedData.paginated.length > 0 ? (
                  processedData.paginated.map((item) => (
                    <tr key={item.itemCode} className="group hover:bg-zinc-50 transition-colors border-b border-zinc-50 last:border-0 cursor-pointer">
                      <td className="px-6 py-4 font-mono text-zinc-500 text-xs group-hover:text-zinc-900 font-medium">{item.itemCode}</td>
                      <td className="px-6 py-4"><span className="font-medium text-zinc-900 block">{item.name}</span></td>
                      <td className="px-6 py-4"><span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-100 text-zinc-600 tracking-wide border border-zinc-200/50">{item.category}</span></td>
                      <td className="px-6 py-4 text-center text-zinc-500">{item.unit}</td>
                      <td className="px-6 py-4 text-right text-zinc-400 text-xs font-light">{item.createdAt}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="5" className="px-6 py-24 text-center"><div className="flex flex-col items-center justify-center text-zinc-400"><Search size={32} strokeWidth={1} className="mb-2 opacity-50"/><p className="text-sm">No items found</p></div></td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* --- PAGINATION FOOTER --- */}
          <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Left: Rows per page selector */}
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <span>Rows per page:</span>
              <select 
                value={itemsPerPage} 
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-white border border-zinc-200 rounded-lg px-2 py-1 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-100 cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>

            {/* Right: Navigation & Page Info */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-500">
                Page <span className="font-medium text-zinc-900">{currentPage}</span> of <span className="font-medium text-zinc-900">{processedData.totalPages || 1}</span>
              </span>
              
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-white hover:text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(processedData.totalPages, p + 1))}
                  disabled={currentPage >= processedData.totalPages || processedData.totalPages === 0}
                  className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-white hover:text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}