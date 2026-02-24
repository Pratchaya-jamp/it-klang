import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, SlidersHorizontal, ChevronDown, Check, Plus, X, Trash2,
  Package, Layers, Scale, BarChart3, Clock, ArrowUp, ArrowDown, 
  ChevronLeft, ChevronRight, Save, Loader2, Pencil, AlertTriangle
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useToast } from '../context/ToastContext';
import { createPortal } from 'react-dom';

// Utility
function cn(...inputs) { return twMerge(clsx(inputs)); }

// --- API SERVICES ---
const fetchItems = async (queryString) => {
  try {
    const response = await fetch(`/api/items/dashboard?${queryString}`);
    if (!response.ok) throw new Error(`API Error`);
    return await response.json();
  } catch (error) {
    return { data: [] };
  }
};

const createItem = async (payload) => {
  const response = await fetch('/api/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to create item');
  return await response.json();
};

const updateItem = async (code, payload) => {
  const response = await fetch(`/api/items/${code}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to update item');
  return await response.json();
};

const deleteItem = async (code) => {
  const response = await fetch(`/api/items/${code}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete item');
  return true;
};

// --- SUB-COMPONENTS ---

const RealTimeClock = () => {
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // จัดรูปแบบวันที่และเวลา (Bangkok Time)
  const formattedTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);

  return <span className="font-mono font-medium">{formattedTime}</span>;
};

// 1. Creatable Select
const CreatableSelect = ({ label, value, onChange, options, placeholder = "Select or type..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredOptions = options.filter(opt => opt.toLowerCase().includes((value || "").toLowerCase()));
  const isCustomValue = value && !options.some(opt => opt.toLowerCase() === value.toLowerCase());

  return (
    <div className="space-y-1" ref={wrapperRef}>
      <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">{label}</label>
      <div className="relative">
        <input type="text" required placeholder={placeholder} value={value} onChange={(e) => { onChange(e.target.value); setIsOpen(true); }} onFocus={() => setIsOpen(true)} className="w-full h-11 px-3 pr-10 bg-zinc-50 border border-transparent rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-200 transition-all outline-none" />
        <button type="button" onClick={() => setIsOpen(!isOpen)} className="absolute right-0 top-0 h-full w-10 flex items-center justify-center text-zinc-400 hover:text-zinc-600 outline-none" tabIndex={-1}><ChevronDown size={14} className={cn("transition-transform", isOpen && "rotate-180")} /></button>
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-zinc-100 rounded-lg shadow-xl max-h-48 overflow-auto animate-in fade-in zoom-in-95 duration-100">
            {filteredOptions.length > 0 ? filteredOptions.map((opt) => (
              <div key={opt} onClick={() => { onChange(opt); setIsOpen(false); }} className={cn("px-3 py-2.5 text-sm cursor-pointer hover:bg-zinc-50 flex items-center justify-between transition-colors", value === opt ? "bg-zinc-50 font-medium text-zinc-900" : "text-zinc-600")}>{opt}{value === opt && <Check size={14} />}</div>
            )) : null}
            {isCustomValue && <div onClick={() => setIsOpen(false)} className="px-3 py-2.5 text-xs text-zinc-400 border-t border-zinc-50 italic cursor-pointer hover:bg-zinc-50">Use new category: "<span className="text-zinc-700 font-medium">{value}</span>"</div>}
            {!value && filteredOptions.length === 0 && <div className="px-3 py-2.5 text-xs text-zinc-400 italic">Type to add new...</div>}
          </div>
        )}
      </div>
    </div>
  );
};

// 2. Item Modal
// ✅ รับ props categories เข้ามาแทนการสร้าง Preset ภายใน
const ItemModal = ({ isOpen, onClose, onSuccess, initialData = null, categories = [] }) => {
  const isEditMode = !!initialData;
  const [formData, setFormData] = useState({ itemCode: '', name: '', category: '', unit: '', quantity: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setIsMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({ ...initialData });
      } else {
        setFormData({ itemCode: '', name: '', category: '', unit: '', quantity: '' });
      }
    }
  }, [isOpen, initialData]);

  const isFormValid = () => {
    if (!isEditMode) return Object.values(formData).every(val => val !== '' && val !== null);
    const { quantity, ...rest } = formData; 
    return Object.values(rest).every(val => val !== '' && val !== null);
  };
  
  const isChanged = isEditMode ? JSON.stringify(formData) !== JSON.stringify(initialData) : true;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid() || (!isChanged && isEditMode)) return;
    setIsSubmitting(true);
    try {
      const payload = { ...formData, quantity: Number(formData.quantity) };
      if (isEditMode) {
        await updateItem(formData.itemCode, payload);
        onSuccess("Item updated successfully!", "success");
      } else {
        await createItem(payload);
        onSuccess("Item created successfully!", "success");
      }
      onClose();
    } catch (error) {
      onSuccess(`Failed to ${isEditMode ? 'update' : 'create'} item.`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) return null;

  return createPortal (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className={cn("absolute inset-0 bg-zinc-900/20 backdrop-blur-sm transition-opacity duration-300 ease-out", isVisible ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <div className={cn("relative bg-white w-full max-w-md p-6 rounded-2xl shadow-2xl border border-zinc-100 flex flex-col gap-6 transform transition-all duration-300 ease-out", isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4")}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 tracking-tight">{isEditMode ? 'Edit Item' : 'New Inventory Item'}</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{isEditMode ? `Updating details for ${initialData.itemCode}` : 'Fill in the details to add to stock.'}</p>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-full transition-colors"><X size={20} strokeWidth={1.5} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Item Code {isEditMode && <span className="text-zinc-300 font-normal">(Read-only)</span>}</label>
            <input type="text" required placeholder="Ex. 00000025" value={formData.itemCode} onChange={e => setFormData({...formData, itemCode: e.target.value})} disabled={isEditMode} className={cn("w-full h-11 px-3 border rounded-xl text-sm transition-all outline-none", isEditMode ? "bg-zinc-100 border-zinc-200 text-zinc-500 cursor-not-allowed" : "bg-zinc-50 border-transparent focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-200")} />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Product Name</label>
            <input type="text" required placeholder="Product Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full h-11 px-3 bg-zinc-50 border border-transparent rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-200 transition-all outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* ✅ ใช้ Dynamic Categories ที่รับมาจาก Props */}
            <CreatableSelect label="Category" value={formData.category} onChange={(val) => setFormData({...formData, category: val})} options={categories} placeholder="Select or type..." />
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Unit</label>
              <input type="text" required placeholder="PC, Box..." value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full h-11 px-3 bg-zinc-50 border border-transparent rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-200 transition-all outline-none" />
            </div>
          </div>
          {!isEditMode && (
            <div className="space-y-1 animate-in fade-in slide-in-from-top-1">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Quantity</label>
              <input type="number" required placeholder="0" min="0" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="w-full h-11 px-3 bg-zinc-50 border border-transparent rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-200 transition-all outline-none" />
            </div>
          )}
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-medium hover:bg-zinc-50 transition-all active:scale-95">Cancel</button>
            <button type="submit" disabled={!isFormValid() || isSubmitting || (!isChanged && isEditMode)} className="flex-1 h-11 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-zinc-200 active:scale-95">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isEditMode ? 'Update Changes' : 'Save Item'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

// 3. Delete Confirm Modal
const DeleteModal = ({ isOpen, onClose, onConfirm, itemCode }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setIsMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    setIsDeleting(true);
    await onConfirm();
    setIsDeleting(false);
    onClose();
  };

  if (!isMounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className={cn("absolute inset-0 bg-zinc-900/20 backdrop-blur-sm transition-opacity duration-300 ease-out", isVisible ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <div className={cn("relative bg-white w-full max-w-sm p-6 rounded-2xl shadow-2xl border border-zinc-100 flex flex-col items-center text-center gap-4 transform transition-all duration-300 ease-out", isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4")}>
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-2"><AlertTriangle size={24} /></div>
        <div><h3 className="text-lg font-semibold text-zinc-900">Delete Item?</h3><p className="text-sm text-zinc-500 mt-1">Are you sure you want to delete <span className="font-mono font-medium text-zinc-700">{itemCode}</span>?<br/>This action cannot be undone.</p></div>
        <div className="flex gap-3 w-full mt-2">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-medium hover:bg-zinc-50 transition-all">Cancel</button>
          <button onClick={handleConfirm} disabled={isDeleting} className="flex-1 h-10 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-all shadow-md shadow-red-100 flex items-center justify-center gap-2">{isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}Delete</button>
        </div>
      </div>
    </div>
  );
};

// --- HELPER COMPONENTS ---
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
      <button type="button" onClick={() => setIsOpen(!isOpen)} className={cn("w-full flex items-center justify-between px-3 py-2 bg-zinc-50 border border-transparent rounded-lg text-sm transition-all", "hover:bg-zinc-100", isOpen ? "bg-white border-zinc-300 ring-2 ring-zinc-50" : "", !value ? "text-zinc-400" : "text-zinc-900 font-medium")}>
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

// --- MAIN DASHBOARD ---
export default function Dashboard() {
  const { showToast } = useToast();
  
  const [searchId, setSearchId] = useState("");
  const [category, setCategory] = useState(""); 
  const [keyword, setKeyword] = useState("");   
  const [variant, setVariant] = useState("");   
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); 
  const [deletingItem, setDeletingItem] = useState(null); 

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const filterRef = useRef(null);

  // ✅ สร้าง State ใหม่สำหรับเก็บ Category แบบไดนามิก
  const [dbCategories, setDbCategories] = useState([]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) setIsFilterOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchId) params.append('searchId', searchId);
    if (category) params.append('category', category);
    if (keyword) params.append('keyword', keyword);
    if (variant) params.append('variant', variant);
    
    const res = await fetchItems(params.toString());
    const fetchedData = res.data || [];
    
    setData(fetchedData);

    // ✅ สะสม Category ที่ดึงมา เพื่อให้ Dropdown มีตัวเลือกครบเสมอ แม้จะกำลังถูก Filter อยู่
    setDbCategories(prev => {
      const catSet = new Set(prev);
      fetchedData.forEach(item => {
        if (item.category) catSet.add(item.category);
      });
      return Array.from(catSet).sort(); // เรียงตัวอักษรให้สวยงาม
    });

    setLoading(false);
    setCurrentPage(1);
  };

  const isFirstRun = useRef(true);

  useEffect(() => {
    if (isFirstRun.current) {
      fetchData();
      isFirstRun.current = false;
      return;
    }
    const timeoutId = setTimeout(() => fetchData(), 500);
    return () => clearTimeout(timeoutId);
  }, [searchId, category, keyword, variant]);

  const handleCreate = () => { setEditingItem(null); setIsModalOpen(true); };
  const handleEdit = (item) => { setEditingItem(item); setIsModalOpen(true); };
  const handleDeleteClick = (item) => { setDeletingItem(item); };

  const handleConfirmDelete = async () => {
    if (deletingItem) {
      try {
        await deleteItem(deletingItem.itemCode);
        showToast("Item deleted successfully", "success");
        fetchData();
      } catch (error) {
        showToast("Failed to delete item", "error");
      }
    }
  };

  const handleModalSuccess = (message, type = 'success') => {
    showToast(message, type);
    if (type === 'success') fetchData();
  };

  const processedData = useMemo(() => {
    if (!data) return { all: [], paginated: [], totalPages: 0 };
    const sorted = [...data].sort((a, b) => sortOrder === 'asc' ? a.itemCode.localeCompare(b.itemCode) : b.itemCode.localeCompare(a.itemCode));
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = sorted.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(sorted.length / itemsPerPage);
    return { all: sorted, paginated: currentItems, totalPages };
  }, [data, sortOrder, currentPage, itemsPerPage]);

  const toggleSort = () => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');

  const stats = useMemo(() => {
    if (!data.length) return { total: 0, categories: 0, units: 0, topCategory: '-' };
    const total = data.length;
    const uniqueCategories = new Set(data.map(item => item.category)).size;
    const uniqueUnits = new Set(data.map(item => item.unit)).size;
    const categoryCounts = data.reduce((acc, item) => { acc[item.category] = (acc[item.category] || 0) + 1; return acc; }, {});
    const topCategory = Object.keys(categoryCounts).reduce((a, b) => categoryCounts[a] > categoryCounts[b] ? a : b, '-');
    const topCategoryPercent = Math.round((categoryCounts[topCategory] / total) * 100);
    return { total, categories: uniqueCategories, units: uniqueUnits, topCategory, topCategoryPercent };
  }, [data]);

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
    <div className="max-w-7xl mx-auto pb-20 px-4 md:px-8 space-y-8 relative">
      {/* ✅ ส่ง dbCategories เข้าไปให้ ItemModal */}
      <ItemModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={handleModalSuccess} initialData={editingItem} categories={dbCategories} />
      <DeleteModal isOpen={!!deletingItem} onClose={() => setDeletingItem(null)} onConfirm={handleConfirmDelete} itemCode={deletingItem?.itemCode} />

      <div className="flex items-end justify-between py-6">
        <div><h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Dashboard</h1><p className="text-zinc-500 text-sm font-light mt-1">Real-time inventory overview.</p></div>
        <div className="hidden sm:flex text-sm text-zinc-400 font-light items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-zinc-100 shadow-sm"><Clock size={14}/> <RealTimeClock /></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Items" value={stats.total} subtext="Filtered items count" icon={Package} />
        <StatCard title="Active Categories" value={stats.categories} subtext="Product lines found" icon={Layers} />
        <StatCard title="Unit Types" value={stats.units} subtext="Distinct counting units" icon={Scale} />
        <StatCard title="Dominant Category" value={stats.topCategory} subtext={stats.total > 0 ? `${stats.topCategoryPercent}% of total inventory` : "No data available"} icon={BarChart3} highlight={true} />
      </div>
      <div className="h-px w-full bg-zinc-100"></div>

      <div>
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center gap-3 w-full">
            <div className="relative flex-1 group"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-800 transition-colors" size={18} /><input type="text" placeholder="Search by Item Code..." value={searchId} onChange={(e) => setSearchId(e.target.value)} className="w-full h-11 pl-10 pr-4 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-100 focus:border-zinc-300 transition-all shadow-sm" /></div>
            <div className="relative" ref={filterRef}>
              <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={cn("h-11 w-11 flex items-center justify-center rounded-xl border transition-all shadow-sm", isFilterOpen || hasActiveFilters ? "bg-zinc-900 border-zinc-900 text-white" : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50")}><SlidersHorizontal size={18} strokeWidth={2} />{hasActiveFilters && !isFilterOpen && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>}</button>
              {isFilterOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-zinc-100 p-4 z-30 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex justify-between mb-4"><span className="text-sm font-semibold text-zinc-900">Filters</span>{hasActiveFilters && <button onClick={clearAllFilters} className="text-[10px] text-red-500 hover:underline flex items-center gap-1"><Trash2 size={10}/> Reset</button>}</div>
                  <div className="space-y-4">
                    {/* ✅ ใช้ Dynamic Categories กับ Filter Dropdown */}
                    <CustomSelect label="Category" options={dbCategories} value={category} onChange={handleCategoryChange} />
                    <div className="pt-2 border-t border-zinc-100">{renderSubFilters()}</div>
                  </div>
                </div>
              )}
            </div>
            <button onClick={handleCreate} className="h-11 px-5 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-sm shadow-zinc-200 active:scale-95"><Plus size={16} /> <span className="hidden sm:inline">New Item</span></button>
          </div>
          {hasActiveFilters && <div className="flex flex-wrap items-center gap-2 animate-in slide-in-from-left-2 fade-in"><span className="text-xs text-zinc-400 font-medium mr-1">Active Filters:</span>{[category, keyword, variant].filter(Boolean).map((t) => (<span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">{t} <button onClick={() => {if(t===category)setCategory("");if(t===keyword)setKeyword("");if(t===variant)setVariant("")}} className="hover:text-red-500 transition-colors"><X size={12}/></button></span>))}</div>}
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/30">
                  <th className="px-6 py-4 cursor-pointer hover:bg-zinc-50 transition-colors group/sort select-none" onClick={toggleSort}><div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500 group-hover/sort:text-zinc-900">Code<div className="flex flex-col">{sortOrder === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>}</div></div></th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400">Name</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400">Category</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-center">Unit</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-right">Date</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {loading ? (
                  [...Array(5)].map((_, i) => <tr key={i} className="animate-pulse"><td colSpan="6" className="px-6 py-4"><div className="h-2 bg-zinc-100 rounded w-full"></div></td></tr>)
                ) : processedData.paginated.length > 0 ? (
                  processedData.paginated.map((item) => (
                    <tr key={item.itemCode} className="group hover:bg-zinc-50 transition-colors border-b border-zinc-50 last:border-0">
                      <td className="px-6 py-4 font-mono text-zinc-500 text-xs group-hover:text-zinc-900 font-medium">{item.itemCode}</td>
                      <td className="px-6 py-4"><span className="font-medium text-zinc-900 block">{item.name}</span></td>
                      <td className="px-6 py-4"><span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-100 text-zinc-600 tracking-wide border border-zinc-200/50">{item.category}</span></td>
                      <td className="px-6 py-4 text-center text-zinc-500">{item.unit}</td>
                      <td className="px-6 py-4 text-right text-zinc-400 text-xs font-light">{item.createdAt}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEdit(item)} className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit"><Pencil size={15} strokeWidth={2} /></button>
                          <button onClick={() => handleDeleteClick(item)} className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 size={15} strokeWidth={2} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="6" className="px-6 py-24 text-center"><div className="flex flex-col items-center justify-center text-zinc-400"><Search size={32} strokeWidth={1} className="mb-2 opacity-50"/><p className="text-sm">No items found</p></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-zinc-500"><span>Rows:</span><select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-white border border-zinc-200 rounded-lg px-2 py-1 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-100 cursor-pointer"><option value={5}>5</option><option value={10}>10</option><option value={20}>20</option></select></div>
            <div className="flex items-center gap-4"><span className="text-sm text-zinc-500">Page <span className="font-medium text-zinc-900">{currentPage}</span> of <span className="font-medium text-zinc-900">{processedData.totalPages || 1}</span></span><div className="flex items-center gap-1"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-white hover:text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={16} /></button><button onClick={() => setCurrentPage(p => Math.min(processedData.totalPages, p + 1))} disabled={currentPage >= processedData.totalPages || processedData.totalPages === 0} className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-white hover:text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronRight size={16} /></button></div></div>
          </div>
        </div>
      </div>
    </div>
  );
}