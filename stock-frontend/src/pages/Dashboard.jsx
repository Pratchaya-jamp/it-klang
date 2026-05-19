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

// ดึงข้อมูล Audit Logs
const fetchItemLogs = async (itemCode) => {
  try {
    const response = await fetch(`/api/auditlogs/${itemCode}`);
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : (data.data || []);
  } catch (error) {
    console.error("Failed to fetch audit logs", error);
    return [];
  }
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

  const formattedTime = new Intl.DateTimeFormat('th-TH', {
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
const CreatableSelect = ({ label, value, onChange, options, placeholder = "เลือกหรือพิมพ์..." }) => {
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
            {isCustomValue && <div onClick={() => setIsOpen(false)} className="px-3 py-2.5 text-xs text-zinc-400 border-t border-zinc-50 italic cursor-pointer hover:bg-zinc-50">ใช้หมวดหมู่ใหม่: "<span className="text-zinc-700 font-medium">{value}</span>"</div>}
            {!value && filteredOptions.length === 0 && <div className="px-3 py-2.5 text-xs text-zinc-400 italic">พิมพ์เพื่อเพิ่มใหม่...</div>}
          </div>
        )}
      </div>
    </div>
  );
};

// 2. Item Modal (ฉบับปรับปรุงระบบตรวจสอบการเปลี่ยนแปลงค่า)
const ItemModal = ({ isOpen, onClose, onSuccess, initialData = null, categories = [] }) => {
  const isEditMode = !!initialData;
  
  // State สำหรับเก็บค่าปัจจุบันในฟอร์ม
  const [formData, setFormData] = useState({ 
    itemCode: '', name: '', category: '', jobNo: '', unit: '', quantity: '' 
  });

  // ✅ State สำหรับเก็บค่า "อ้างอิง" จาก Server (เอาไว้เช็คว่า User แก้ไขอะไรไปบ้าง)
  const [baselineData, setBaselineData] = useState(null);
  
  const [isAutoCode, setIsAutoCode] = useState(false); 
  const [canEditQuantity, setCanEditQuantity] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // ควบคุมการแสดงผล Modal
  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setIsVisible(true)));
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setIsMounted(false);
        setBaselineData(null); // ล้างค่า baseline เมื่อปิด
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // โหลดข้อมูลเบื้องหลังเมื่อเปิดหน้า Edit
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // 1. ตั้งค่าเริ่มต้นจากแถวที่กดมาก่อน (เพื่อให้ฟอร์มไม่ว่างระหว่างรอ API)
        const initialForm = {
          itemCode: initialData.itemCode || '',
          name: initialData.name || '',
          category: initialData.category || '',
          jobNo: initialData.jobNo || '',
          unit: initialData.unit || '',
          quantity: initialData.quantity || 0
        };
        setFormData(initialForm);
        setIsAutoCode(false);
        setIsLoading(true);

        // 2. ดึงข้อมูลจริงจาก Server มาทับเพื่อความแม่นยำ (Audit Logs & Stock Overview)
        Promise.all([
          fetchItemLogs(initialData.itemCode),
          fetch('/api/stocks/overview').then(res => res.ok ? res.json() : [])
        ]).then(([logs, stockRes]) => {
          
          // ตรวจสอบสิทธิ์การแก้ Quantity
          const allowedActions = ['CREATE', 'UPDATE', 'UPDATE_CODE'];
          const isStockMoved = logs.some(log => !allowedActions.includes(log.action));
          setCanEditQuantity(!isStockMoved);

          // ดึง Quantity ล่าสุดจาก Stock Overview
          const stockList = Array.isArray(stockRes) ? stockRes : (stockRes.data || []);
          const serverStock = stockList.find(s => s.itemCode === initialData.itemCode);
          
          const finalQuantity = serverStock ? serverStock.totalQuantity : initialData.quantity;

          // ✅ บันทึกค่า Baseline ที่ดึงมาจาก Server จริงๆ
          const serverBaseline = { 
            ...initialForm, 
            quantity: finalQuantity 
          };
          
          setBaselineData(serverBaseline);
          setFormData(serverBaseline); // อัปเดตฟอร์มให้ตรงกับยอดในสต็อกจริง

        }).finally(() => setIsLoading(false));

      } else {
        // โหมดสร้างใหม่
        const newForm = { itemCode: '', name: '', category: '', jobNo: '', unit: '', quantity: '' };
        setFormData(newForm);
        setBaselineData(newForm);
        setIsAutoCode(false);
        setCanEditQuantity(true);
      }
    }
  }, [isOpen, initialData]);

  // ตรวจสอบเงื่อนไขรหัสอุปกรณ์
  const isDraftCode = isEditMode && initialData?.itemCode?.toUpperCase().startsWith('DRAFT-');
  const canEditCode = isEditMode ? isDraftCode : !isAutoCode;

  // ✅ ตรวจสอบว่า "ข้อมูลมีการเปลี่ยนแปลงจากค่าที่ดึงมาจาก Server หรือไม่"
  const isChanged = useMemo(() => {
    if (!baselineData) return false;
    
    // เทียบทุก Field (แปลงเป็น String เพื่อความชัวร์ในการเทียบค่าตัวเลขและ null)
    return (
      formData.itemCode?.trim() !== baselineData.itemCode?.trim() ||
      formData.name?.trim() !== baselineData.name?.trim() ||
      formData.category !== baselineData.category ||
      (formData.jobNo || '') !== (baselineData.jobNo || '') ||
      formData.unit?.trim() !== baselineData.unit?.trim() ||
      Number(formData.quantity) !== Number(baselineData.quantity)
    );
  }, [formData, baselineData]);

  const isFormValid = () => {
    const { name, category, unit, quantity, itemCode } = formData;
    const isCodeValid = canEditCode ? itemCode.trim() !== '' : true;
    return name.trim() !== '' && category !== '' && unit.trim() !== '' && quantity !== '' && isCodeValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid() || !isChanged || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const finalItemCode = (!isEditMode && isAutoCode) ? null : formData.itemCode.trim();
      const payload = { 
        ...formData, 
        itemCode: finalItemCode,
        quantity: Number(formData.quantity),
        jobNo: formData.jobNo?.trim() === '' ? null : formData.jobNo?.trim()
      };

      if (isEditMode) {
        await updateItem(initialData.itemCode, payload);
        onSuccess("อัปเดตเรียบร้อยแล้ว", "success");
      } else {
        await createItem(payload);
        onSuccess("เพิ่มอุปกรณ์ใหม่เรียบร้อยแล้ว", "success");
      }
      onClose();
    } catch (error) {
      onSuccess(error.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) return null;

  return createPortal (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className={cn("absolute inset-0 bg-zinc-900/20 backdrop-blur-sm transition-opacity duration-300", isVisible ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <div className={cn("relative bg-white w-full max-w-md p-6 rounded-2xl shadow-2xl border border-zinc-100 flex flex-col gap-6 transform transition-all duration-300", isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4")}>
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">{isEditMode ? 'แก้ไขรายละเอียดอุปกรณ์' : 'เพิ่มอุปกรณ์ใหม่'}</h2>
            {isLoading && <div className="flex items-center gap-2 text-[10px] text-blue-500 font-medium animate-pulse"><Loader2 size={10} className="animate-spin" /> กำลังตรวจสอบข้อมูลล่าสุด...</div>}
          </div>
          <button onClick={onClose} className="p-2 -mr-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-full"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Item Code */}
            <div className="space-y-1">
              <div className="flex items-center justify-between ml-1 mb-1">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  รหัสอุปกรณ์ {isEditMode && !canEditCode && <span className="text-zinc-300 font-normal">(แก้ไขไม่ได้)</span>}
                </label>
                {!isEditMode && (
                  <label className="relative inline-flex items-center cursor-pointer gap-2 pr-1">
                    <span className="text-[10px] text-zinc-500 font-medium">ระบบตั้งให้</span>
                    <div className="relative">
                      <input type="checkbox" className="sr-only peer" checked={isAutoCode} onChange={(e) => setIsAutoCode(e.target.checked)} />
                      <div className="w-8 h-4 bg-zinc-200 rounded-full peer peer-checked:bg-emerald-500 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4 peer-checked:after:border-white"></div>
                    </div>
                  </label>
                )}
              </div>
              <input 
                type="text" value={isAutoCode ? "" : formData.itemCode} placeholder={isAutoCode ? "Auto Generate" : "รหัสอุปกรณ์"}
                onChange={e => setFormData({...formData, itemCode: e.target.value})} disabled={!canEditCode}
                className={cn("w-full h-11 px-3 border rounded-xl text-sm outline-none transition-all", !canEditCode ? "bg-zinc-50 border-zinc-200 text-zinc-400 cursor-not-allowed" : "bg-zinc-50 border-transparent focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-200")} 
              />
            </div>

            {/* Job No */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1 mt-[5px] block">รหัสงาน</label>
              <input type="text" placeholder="JOB-XXXX" value={formData.jobNo} onChange={e => setFormData({...formData, jobNo: e.target.value})} className="w-full h-11 px-3 bg-zinc-50 border border-transparent rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-200 outline-none transition-all" />
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">ชื่ออุปกรณ์</label>
            <input type="text" required placeholder="ระบุชื่ออุปกรณ์" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full h-11 px-3 bg-zinc-50 border border-transparent rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-200 outline-none transition-all" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <CreatableSelect label="หมวดหมู่" value={formData.category} onChange={(val) => setFormData({...formData, category: val})} options={categories} />
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">หน่วยนับ</label>
              <input type="text" required placeholder="เช่น ชิ้น" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full h-11 px-3 bg-zinc-50 border border-transparent rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-200 outline-none transition-all" />
            </div>
          </div>
          
          {/* Quantity (Baseline Comparison Logic) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between ml-1">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                จำนวน{isEditMode ? 'รวมในระบบ' : 'เริ่มต้น'}
                {isEditMode && !canEditQuantity && !isLoading && (
                  <span className="text-amber-500 font-medium normal-case ml-1.5">(ล็อคยอดเนื่องจากมีการเดินรายการ)</span>
                )}
              </label>
            </div>
            <input 
              type="number" required min="0" value={formData.quantity} 
              onChange={e => setFormData({...formData, quantity: e.target.value})} 
              disabled={isEditMode && !canEditQuantity} placeholder="จำนวนตั้งต้น"
              className={cn(
                "w-full h-11 px-3 border rounded-xl text-sm outline-none transition-all",
                (isEditMode && !canEditQuantity) ? "bg-zinc-50 border-zinc-100 text-zinc-400 cursor-not-allowed" : "bg-zinc-50 border-transparent focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-200"
              )} 
            />
          </div>
          
          {/* Action Buttons */}
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-medium hover:bg-zinc-50 active:scale-95 transition-all">ยกเลิก</button>
            <button 
              type="submit" 
              disabled={!isFormValid() || !isChanged || isSubmitting} 
              className={cn(
                "flex-1 h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95",
                isChanged ? "bg-zinc-900 text-white shadow-zinc-200 hover:bg-zinc-800" : "bg-zinc-100 text-zinc-400 shadow-none cursor-not-allowed"
              )}
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isEditMode ? (isChanged ? 'บันทึกการแก้ไข' : 'ไม่มีการเปลี่ยนค่า') : 'เพิ่มอุปกรณ์'}
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
        <div><h3 className="text-lg font-semibold text-zinc-900">ยืนยันการลบอุปกรณ์?</h3><p className="text-sm text-zinc-500 mt-1">คุณแน่ใจหรือไม่ว่าต้องการลบ <span className="font-mono font-medium text-zinc-700">{itemCode}</span>?<br/>การกระทำนี้ไม่สามารถย้อนกลับได้</p></div>
        <div className="flex gap-3 w-full mt-2">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-medium hover:bg-zinc-50 transition-all">ยกเลิก</button>
          <button onClick={handleConfirm} disabled={isDeleting} className="flex-1 h-10 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-all shadow-md shadow-red-100 flex items-center justify-center gap-2">{isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}ลบอุปกรณ์</button>
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

const CustomSelect = ({ label, value, onChange, options, placeholder = "เลือก..." }) => {
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

    setDbCategories(prev => {
      const catSet = new Set(prev);
      fetchedData.forEach(item => {
        if (item.category) catSet.add(item.category);
      });
      return Array.from(catSet).sort(); 
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
        showToast("ลบอุปกรณ์เรียบร้อยแล้ว", "success");
        fetchData();
      } catch (error) {
        showToast("เกิดข้อผิดพลาดในการลบอุปกรณ์", "error");
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
    if (!category) return <div className="p-4 text-center text-xs text-zinc-400 bg-zinc-50 rounded-lg border border-dashed border-zinc-200">โปรดเลือกหมวดหมู่ก่อน</div>;
    if (['Mouse', 'Keyboard'].includes(category)) return <CustomSelect label="การเชื่อมต่อ" options={['USB', 'Wireless']} value={keyword} onChange={setKeyword} />;
    if (category === 'SSD') return <div className="space-y-3"><CustomSelect label="อินเทอร์เฟซ" options={['SATA', 'M.2']} value={keyword} onChange={setKeyword} /><CustomSelect label="ความจุ" options={['120GB', '240GB', '500GB', '1TB']} value={variant} onChange={setVariant} /></div>;
    if (category === 'RAM') return <div className="space-y-3"><CustomSelect label="ประเภท" options={['DDR3', 'DDR4']} value={keyword} onChange={setKeyword} /><CustomSelect label="ความจุ" options={['4GB', '8GB', '16GB']} value={variant} onChange={setVariant} /></div>;
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4 md:px-8 space-y-8 relative">
      <ItemModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={handleModalSuccess} initialData={editingItem} categories={dbCategories} />
      <DeleteModal isOpen={!!deletingItem} onClose={() => setDeletingItem(null)} onConfirm={handleConfirmDelete} itemCode={deletingItem?.itemCode} />

      <div className="flex items-end justify-between py-6">
        <div><h1 className="text-2xl font-semibold tracking-tight text-zinc-900">แดชบอร์ด</h1><p className="text-zinc-500 text-sm font-light mt-1">ภาพรวมคลังอุปกรณ์แบบเรียลไทม์</p></div>
        <div className="hidden sm:flex text-sm text-zinc-400 font-light items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-zinc-100 shadow-sm"><Clock size={14}/> <RealTimeClock /></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="อุปกรณ์ทั้งหมด" value={stats.total} subtext="จำนวนรายการจากการกรอง" icon={Package} />
        <StatCard title="หมวดหมู่ที่มีอยู่" value={stats.categories} subtext="ประเภทอุปกรณ์ที่พบ" icon={Layers} />
        <StatCard title="ประเภทหน่วยนับ" value={stats.units} subtext="หน่วยนับที่ไม่ซ้ำกัน" icon={Scale} />
        <StatCard title="หมวดหมู่หลัก" value={stats.topCategory} subtext={stats.total > 0 ? `${stats.topCategoryPercent}% ของคลังอุปกรณ์ทั้งหมด` : "ไม่มีข้อมูล"} icon={BarChart3} highlight={true} />
      </div>
      <div className="h-px w-full bg-zinc-100"></div>

      <div>
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center gap-3 w-full">
            <div className="relative flex-1 group"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-800 transition-colors" size={18} /><input type="text" placeholder="ค้นหาด้วยรหัสอุปกรณ์..." value={searchId} onChange={(e) => setSearchId(e.target.value)} className="w-full h-11 pl-10 pr-4 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-100 focus:border-zinc-300 transition-all shadow-sm" /></div>
            <div className="relative" ref={filterRef}>
              <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={cn("h-11 w-11 flex items-center justify-center rounded-xl border transition-all shadow-sm", isFilterOpen || hasActiveFilters ? "bg-zinc-900 border-zinc-900 text-white" : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50")}><SlidersHorizontal size={18} strokeWidth={2} />{hasActiveFilters && !isFilterOpen && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>}</button>
              {isFilterOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-zinc-100 p-4 z-30 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex justify-between mb-4"><span className="text-sm font-semibold text-zinc-900">ตัวกรอง</span>{hasActiveFilters && <button onClick={clearAllFilters} className="text-[10px] text-red-500 hover:underline flex items-center gap-1"><Trash2 size={10}/> รีเซ็ต</button>}</div>
                  <div className="space-y-4">
                    <CustomSelect label="หมวดหมู่" options={dbCategories} value={category} onChange={handleCategoryChange} />
                    <div className="pt-2 border-t border-zinc-100">{renderSubFilters()}</div>
                  </div>
                </div>
              )}
            </div>
            <button onClick={handleCreate} className="h-11 px-5 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-sm shadow-zinc-200 active:scale-95"><Plus size={16} /> <span className="hidden sm:inline">เพิ่มอุปกรณ์</span></button>
          </div>
          {hasActiveFilters && <div className="flex flex-wrap items-center gap-2 animate-in slide-in-from-left-2 fade-in"><span className="text-xs text-zinc-400 font-medium mr-1">ตัวกรองที่ใช้งาน:</span>{[category, keyword, variant].filter(Boolean).map((t) => (<span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">{t} <button onClick={() => {if(t===category)setCategory("");if(t===keyword)setKeyword("");if(t===variant)setVariant("")}} className="hover:text-red-500 transition-colors"><X size={12}/></button></span>))}</div>}
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/30">
                  <th className="px-6 py-4 cursor-pointer hover:bg-zinc-50 transition-colors group/sort select-none" onClick={toggleSort}><div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500 group-hover/sort:text-zinc-900">รหัส<div className="flex flex-col">{sortOrder === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>}</div></div></th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400">ชื่อ</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400">หมวดหมู่</th>
                  {/* ✅ เพิ่มคอลัมน์รหัสงาน (Job No) ไว้หน้าหน่วย */}
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-center">รหัสงาน</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-center">หน่วย</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-right">วันที่</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {loading ? (
                  [...Array(5)].map((_, i) => <tr key={i} className="animate-pulse"><td colSpan="7" className="px-6 py-4"><div className="h-2 bg-zinc-100 rounded w-full"></div></td></tr>)
                ) : processedData.paginated.length > 0 ? (
                  processedData.paginated.map((item) => (
                    <tr key={item.itemCode} className="group hover:bg-zinc-50 transition-colors border-b border-zinc-50 last:border-0">
                      <td className="px-6 py-4 font-mono text-zinc-500 text-xs group-hover:text-zinc-900 font-medium">{item.itemCode}</td>
                      <td className="px-6 py-4"><span className="font-medium text-zinc-900 block">{item.name}</span></td>
                      <td className="px-6 py-4"><span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-100 text-zinc-600 tracking-wide border border-zinc-200/50">{item.category}</span></td>
                      {/* ✅ แสดงข้อมูล Job No */}
                      <td className="px-6 py-4 text-center text-zinc-500 font-medium text-xs">{item.jobNo || '-'}</td>
                      <td className="px-6 py-4 text-center text-zinc-500">{item.unit}</td>
                      <td className="px-6 py-4 text-right text-zinc-400 text-xs font-light">{item.createdAt}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEdit(item)} className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="แก้ไข"><Pencil size={15} strokeWidth={2} /></button>
                          <button onClick={() => handleDeleteClick(item)} className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="ลบ"><Trash2 size={15} strokeWidth={2} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="7" className="px-6 py-24 text-center"><div className="flex flex-col items-center justify-center text-zinc-400"><Search size={32} strokeWidth={1} className="mb-2 opacity-50"/><p className="text-sm">ไม่พบอุปกรณ์</p></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-zinc-500"><span>จำนวนแถว:</span><select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-white border border-zinc-200 rounded-lg px-2 py-1 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-100 cursor-pointer"><option value={5}>5</option><option value={10}>10</option><option value={20}>20</option></select></div>
            <div className="flex items-center gap-4"><span className="text-sm text-zinc-500">หน้า <span className="font-medium text-zinc-900">{currentPage}</span> จาก <span className="font-medium text-zinc-900">{processedData.totalPages || 1}</span></span><div className="flex items-center gap-1"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-white hover:text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={16} /></button><button onClick={() => setCurrentPage(p => Math.min(processedData.totalPages, p + 1))} disabled={currentPage >= processedData.totalPages || processedData.totalPages === 0} className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-white hover:text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronRight size={16} /></button></div></div>
          </div>
        </div>
      </div>
    </div>
  );
}