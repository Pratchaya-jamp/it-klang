import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, ArrowRightLeft, Clock, CheckCircle2, 
  Calendar, Hash, Plus, Filter, AlertCircle, X, Loader2, Undo2, BellRing, ChevronDown, Package
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { request } from '../utils/fetchUtils';
import { useToast } from '../context/ToastContext';

// Utility
function cn(...inputs) { return twMerge(clsx(inputs)); }

// Animation คลาสสำหรับ Modal
const ANIMATION_CLASSES = "transform transition-all duration-200 ease-out will-change-[transform,opacity]";

// --- 1. ITEM SELECTOR MODAL (สำหรับค้นหาและเลือกอุปกรณ์) ---
const ItemSelectorModal = ({ isOpen, onClose, onSelect, data }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      setSearchTerm("");
      setCategoryFilter("");
      requestAnimationFrame(() => requestAnimationFrame(() => setIsVisible(true)));
    } else {
      setIsVisible(false);
      setTimeout(() => setIsMounted(false), 200); 
    }
  }, [isOpen]);

  const safeData = Array.isArray(data) ? data : [];
  const filteredData = safeData.filter(item => {
    const matchesSearch = item.itemCode?.toLowerCase().includes(searchTerm.toLowerCase()) || item.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter ? item.category === categoryFilter : true;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(safeData.map(item => item.category).filter(Boolean))];

  if (!isMounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className={cn("fixed inset-0 bg-zinc-900/50 backdrop-blur-sm transition-opacity duration-200 ease-out", isVisible ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <div className={cn("relative bg-white w-full max-w-3xl h-[80vh] rounded-2xl shadow-2xl border border-zinc-100 flex flex-col", ANIMATION_CLASSES, isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4")}>
        <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/80 rounded-t-2xl">
          <div><h3 className="text-lg font-semibold text-zinc-900">เลือกอุปกรณ์</h3><p className="text-sm text-zinc-500">ค้นหาและเลือกอุปกรณ์จากคลังเพื่อขอยืม</p></div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:bg-zinc-200 rounded-full transition-colors"><X size={20}/></button>
        </div>
        <div className="p-4 border-b border-zinc-100 flex gap-3 bg-white shadow-sm z-10">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input type="text" placeholder="ค้นหาด้วยรหัสหรือชื่ออุปกรณ์..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full h-11 pl-10 pr-4 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300 transition-all" autoFocus />
          </div>
          <div className="relative w-48">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full h-11 pl-10 pr-8 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 cursor-pointer appearance-none">
              <option value="">ทุกหมวดหมู่</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={14} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-zinc-50/30">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-white text-zinc-500 font-medium uppercase text-xs sticky top-0 z-10 shadow-sm border-b border-zinc-100">
              <tr><th className="px-6 py-3">รหัส</th><th className="px-6 py-3">ชื่อ</th><th className="px-6 py-3">หมวดหมู่</th><th className="px-6 py-3 text-right">คงเหลือ</th><th className="px-6 py-3 text-center">จัดการ</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredData.length > 0 ? (
                filteredData.map((item) => {
                  // ✅ เช็คว่าเป็นสถานะ DRAFT- หรือไม่
                  const isDraft = item.itemCode?.toUpperCase().startsWith('DRAFT-');

                  return (
                    <tr key={item.itemCode} className="hover:bg-zinc-50 group transition-colors bg-white">
                      <td className="px-6 py-3 font-mono text-zinc-500 font-medium">{item.itemCode}</td>
                      <td className="px-6 py-3 text-zinc-900">{item.name}</td>
                      <td className="px-6 py-3 text-zinc-500">{item.category}</td>
                      <td className="px-6 py-3 text-right font-bold text-zinc-700">{item.balance} <span className="text-[10px] font-normal text-zinc-400">{item.unit}</span></td>
                      <td className="px-6 py-3 text-center">
                        <button 
                          disabled={isDraft}
                          onClick={() => { onSelect(item); onClose(); }} 
                          className={cn(
                            "px-4 py-1.5 text-xs font-medium rounded-lg transition-all shadow-sm",
                            isDraft 
                              ? "bg-zinc-100 text-zinc-400 cursor-not-allowed" 
                              : "bg-zinc-900 text-white hover:bg-zinc-700 active:scale-95"
                          )}
                        >
                          {isDraft ? 'ไม่อนุญาต' : 'เลือก'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="h-[45vh] bg-transparent p-0">
                    <div className="flex flex-col items-center justify-center h-full text-zinc-400 w-full absolute left-0">
                      <Package size={48} className="opacity-20 mb-3" />
                      <p className="text-sm font-medium text-zinc-500">ไม่พบอุปกรณ์</p>
                      <p className="text-xs mt-1 text-zinc-400">ลองปรับการค้นหาหรือตัวกรองหมวดหมู่</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 bg-white border-t border-zinc-100 text-xs text-zinc-400 flex justify-between rounded-b-2xl">
          <span>แสดง {filteredData.length} รายการ</span><span>กด ESC เพื่อปิด</span>
        </div>
      </div>
    </div>,
    document.body
  );
};

// --- 2. BORROW REQUEST MODAL ---
const BorrowModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    itemCode: '',
    itemName: '',
    quantity: 1,
    jobId: '',
    dueDate: '',
    note: ''
  });

  const [inventoryData, setInventoryData] = useState([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      setFormData({ itemCode: '', itemName: '', quantity: 1, jobId: '', dueDate: '', note: '' });
      
      // ดึงข้อมูลอุปกรณ์มาเก็บไว้สำหรับหน้าต่างค้นหา
      request('/api/stocks/overview').then(res => {
        setInventoryData(Array.isArray(res) ? res : (res?.data || []));
      }).catch(err => console.error("Failed to load stock data", err));

      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      setTimeout(() => setIsMounted(false), 300);
    }
  }, [isOpen]);

  const handleSelectItem = (item) => {
    setFormData(prev => ({
      ...prev,
      itemCode: item.itemCode,
      itemName: item.name
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.itemCode) return; 

    setIsSubmitting(true);
    try {
      const [year, month, day] = formData.dueDate.split('-');
      const formattedDueDate = `${day}/${month}/${year}`;

      const payload = {
        itemCode: formData.itemCode,
        quantity: Number(formData.quantity),
        jobId: formData.jobId,
        dueDate: formattedDueDate,
        note: formData.note
      };

      await request('/api/borrow/request', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      onSuccess("ส่งคำขอยืมอุปกรณ์สำเร็จ", "success");
      onClose();
    } catch (error) {
      onSuccess(error.message || "ส่งคำขอยืมอุปกรณ์ไม่สำเร็จ", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  const getEmailAlertMessage = () => {
    if (!formData.dueDate) return "เลือกวันที่คืนเพื่อดูรอบการส่งอีเมลแจ้งเตือน";
    
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    const [year, month, day] = formData.dueDate.split('-');
    const dueDate = new Date(year, month - 1, day);
    
    const diffTime = dueDate.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24)); 

    if (diffDays === 0) {
      return "คืนภายในวัน: อีเมลเตือน 12:30 (หากบันทึกก่อน 12:00) หรือ 15:00 (หากบันทึกหลัง 12:30)";
    } else if (diffDays >= 1 && diffDays <= 3) {
      return "ระยะเวลา 1-3 วัน: อีเมลแจ้งเตือนเวลา 08:30 ของวันครบกำหนดคืน";
    } else if (diffDays >= 4 && diffDays <= 5) {
      return "ระยะเวลา 4-5 วัน: อีเมลเตือนล่วงหน้า 2 วัน ก่อนวันคืนเวลา 08:30";
    } else if (diffDays >= 6 && diffDays <= 7) {
      return "ระยะเวลา 6-7 วัน: อีเมลเตือนล่วงหน้า 3 วัน ก่อนวันคืนเวลา 08:30";
    } else {
      return `ระยะเวลา ${diffDays} วัน: อีเมลเตือนล่วงหน้า 2 วัน ก่อนวันคืนเวลา 08:30`;
    }
  };

  if (!isMounted) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className={cn("absolute inset-0 bg-zinc-900/40 backdrop-blur-sm transition-opacity duration-300 ease-out", isVisible ? "opacity-100" : "opacity-0")} onClick={onClose} />
        
        <div className={cn("relative bg-white w-full max-w-md p-6 rounded-2xl shadow-2xl border border-zinc-100 flex flex-col transform transition-all duration-300 ease-out", isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4")}>
          
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 tracking-tight flex items-center gap-2">
                <ArrowRightLeft size={20} className="text-zinc-900" />
                สร้างคำขอยืมอุปกรณ์
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">กรอกรายละเอียดเพื่อขอยืมอุปกรณ์</p>
            </div>
            <button onClick={onClose} className="p-2 -mr-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-full transition-colors">
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* ✅ อัปเดตช่องรหัสอุปกรณ์ให้สามารถคลิกเพื่อเปิด Modal ได้ */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">รหัสอุปกรณ์</label>
              <div className="relative flex gap-2">
                <div 
                  onClick={() => setIsPickerOpen(true)} 
                  className={cn(
                    "flex-1 h-11 px-3 border rounded-xl text-sm flex items-center cursor-pointer transition-all bg-zinc-50 hover:border-zinc-400 hover:shadow-sm truncate", 
                    !formData.itemCode ? "text-zinc-400 border-zinc-200 border-dashed" : "text-zinc-900 border-zinc-300 font-medium"
                  )}
                >
                    {formData.itemCode ? `${formData.itemCode} - ${formData.itemName}` : "คลิกเพื่อค้นหาอุปกรณ์..."}
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsPickerOpen(true)} 
                  className="h-11 w-11 shrink-0 flex items-center justify-center bg-zinc-200 hover:bg-zinc-300 text-zinc-600 rounded-xl transition-colors"
                >
                  <Search size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">จำนวน</label>
                <input 
                  type="number" required min="1" value={formData.quantity} 
                  onChange={e => setFormData({...formData, quantity: e.target.value})} 
                  className="w-full h-11 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all outline-none" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">รหัสงาน (Job ID)</label>
                <input 
                  type="text" required placeholder="ITSERV1" value={formData.jobId} 
                  onChange={e => setFormData({...formData, jobId: e.target.value.toUpperCase()})} 
                  className="w-full h-11 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all outline-none" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">วันที่กำหนดคืน</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  <input 
                    type="date" required min={today} value={formData.dueDate} 
                    onChange={e => setFormData({...formData, dueDate: e.target.value})} 
                    className="w-full h-11 pl-10 pr-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all outline-none cursor-text" 
                  />
                </div>
              </div>
              
              <div className={cn("px-3 py-2.5 rounded-lg text-[11px] leading-relaxed border flex items-start gap-2 transition-colors", 
                formData.dueDate ? "bg-blue-50 border-blue-100 text-blue-700" : "bg-zinc-50 border-zinc-200 text-zinc-500"
              )}>
                <BellRing size={14} className="mt-0.5 shrink-0" />
                <span className="font-medium">{getEmailAlertMessage()}</span>
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1 flex items-center justify-between">
                หมายเหตุ <span className="text-zinc-300 font-normal normal-case">(ไม่บังคับ)</span>
              </label>
              <input 
                type="text" placeholder="เช่น สำหรับซ่อมบำรุงเซิร์ฟเวอร์ฉุกเฉิน" value={formData.note} 
                onChange={e => setFormData({...formData, note: e.target.value})} 
                className="w-full h-11 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all outline-none" 
              />
            </div>

            <div className="pt-4 flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-medium hover:bg-zinc-50 transition-all active:scale-95">
                ยกเลิก
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting || !formData.itemCode} 
                className="flex-1 h-11 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-zinc-200 active:scale-95"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                ส่งคำขอ
              </button>
            </div>
          </form>
        </div>
      </div>

      <ItemSelectorModal 
        isOpen={isPickerOpen} 
        onClose={() => setIsPickerOpen(false)} 
        onSelect={handleSelectItem} 
        data={inventoryData} 
      />
    </>,
    document.body
  );
};

// --- 3. RETURN CONFIRM MODAL ---
const ReturnModal = ({ isOpen, onClose, onConfirm, transaction }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      setTimeout(() => setIsMounted(false), 300);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    await onConfirm(transaction.transactionId);
    setIsSubmitting(false);
  };

  if (!isMounted || !transaction) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className={cn("absolute inset-0 bg-zinc-900/40 backdrop-blur-sm transition-opacity duration-300 ease-out", isVisible ? "opacity-100" : "opacity-0")} onClick={onClose} />
      
      <div className={cn("relative bg-white w-full max-w-sm p-6 rounded-2xl shadow-2xl border border-zinc-100 flex flex-col transform transition-all duration-300 ease-out", isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4")}>
        
        <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mb-4 mx-auto">
          <Undo2 size={24} />
        </div>
        
        <div className="text-center mb-6">
          <h3 className="text-lg font-bold text-zinc-900">ยืนยันการคืนอุปกรณ์</h3>
          <p className="text-sm text-zinc-500 mt-1">โปรดตรวจสอบรายละเอียดอุปกรณ์ก่อนยืนยันการคืน</p>
        </div>

        <div className="bg-zinc-50 rounded-xl p-4 space-y-3 mb-6 border border-zinc-100">
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-500">รหัสทำรายการ:</span>
            <span className="font-mono font-medium text-zinc-900">{transaction.transactionId}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-500">รหัสอุปกรณ์:</span>
            <span className="font-mono font-medium text-zinc-900">{transaction.itemCode}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-500">ชื่ออุปกรณ์:</span>
            <span className="font-medium text-zinc-900 text-right truncate max-w-[150px]" title={transaction.itemName}>{transaction.itemName}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-500">รหัสงาน:</span>
            <span className="font-medium text-zinc-900">{transaction.jobId || '-'}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} disabled={isSubmitting} className="flex-1 h-11 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-medium hover:bg-zinc-50 transition-all">
            ยกเลิก
          </button>
          <button onClick={handleConfirm} disabled={isSubmitting} className="flex-1 h-11 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100 flex items-center justify-center gap-2">
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            ยืนยันการคืน
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};


// --- CUSTOM SELECT COMPONENT (เหมือนเดิม) ---
const CustomFilterSelect = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { 
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false); 
    };
    document.addEventListener("mousedown", handleClick); 
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div className="relative w-full sm:w-48" ref={wrapperRef}>
      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 z-10 pointer-events-none" size={16} />
      <button 
        type="button" 
        onClick={() => setIsOpen(!isOpen)} 
        className={cn(
          "w-full h-11 pl-9 pr-3 bg-white border border-zinc-200 rounded-xl text-sm transition-all shadow-sm flex items-center justify-between",
          "hover:bg-zinc-50",
          isOpen ? "ring-2 ring-zinc-100 border-zinc-300" : "",
          "text-zinc-700 font-medium"
        )}
      >
        <span className="truncate">{selectedOption.label}</span>
        <ChevronDown size={14} className={cn("transition-transform text-zinc-400", isOpen && "rotate-180")} />
      </button>
      
      {isOpen && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-zinc-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {options.map((opt) => (
            <div 
              key={opt.value} 
              onClick={() => { onChange(opt.value); setIsOpen(false); }} 
              className={cn(
                "px-3 py-2.5 text-sm cursor-pointer hover:bg-zinc-50 transition-colors flex items-center justify-between", 
                value === opt.value ? "bg-zinc-50 font-medium text-zinc-900" : "text-zinc-600"
              )}
            >
              {opt.label} 
              {value === opt.value && <Check size={14} className="text-zinc-900"/>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


// --- 4. MAIN PAGE ---
export default function Borrowing() {
  const { showToast } = useToast();
  
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [returningTransaction, setReturningTransaction] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await request('/api/borrow/history');
      setTransactions(data || []);
    } catch (error) {
      showToast("ดึงข้อมูลประวัติการยืมไม่สำเร็จ", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleConfirmReturn = async (transactionId) => {
    try {
      await request(`/api/borrow/return/${transactionId}`, { method: 'POST' });
      
      setTransactions(prev => prev.map(t => 
        t.transactionId === transactionId ? { ...t, status: 'Returned' } : t
      ));
      
      showToast("คืนอุปกรณ์สำเร็จ", "success");
      setReturningTransaction(null);
    } catch (error) {
      showToast(error.message || "คืนอุปกรณ์ไม่สำเร็จ", "error");
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = 
        t.transactionId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.itemCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.jobId?.toLowerCase().includes(searchQuery.toLowerCase());
        
      const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.borrowDate) - new Date(a.borrowDate));
  }, [transactions, searchQuery, statusFilter]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Intl.DateTimeFormat('th-TH', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(dateString));
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4 md:px-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Modals */}
      <BorrowModal 
        isOpen={isBorrowModalOpen} 
        onClose={() => setIsBorrowModalOpen(false)} 
        onSuccess={(msg, type) => {
          showToast(msg, type);
          if (type === 'success') fetchHistory(); 
        }} 
      />

      <ReturnModal 
        isOpen={!!returningTransaction}
        onClose={() => setReturningTransaction(null)}
        transaction={returningTransaction}
        onConfirm={handleConfirmReturn}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 flex items-center gap-2">
            <ArrowRightLeft className="text-zinc-900" size={24}/>
            ประวัติการยืมอุปกรณ์
          </h1>
          <p className="text-zinc-500 text-sm font-light mt-1">
            ติดตามการยืม คืน และสถานะปัจจุบันของอุปกรณ์
          </p>
        </div>
        
        <button 
          onClick={() => setIsBorrowModalOpen(true)}
          className="h-11 px-5 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-sm shadow-zinc-200 active:scale-95"
        >
          <Plus size={16} /> 
          <span>ขอยืมอุปกรณ์</span>
        </button>
      </div>

      {/* Toolbar: Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-800 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="ค้นหาด้วยรหัสทำรายการ, รหัสอุปกรณ์, ชื่อ หรือรหัสงาน..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-100 focus:border-zinc-300 transition-all shadow-sm" 
          />
        </div>
        
        <CustomFilterSelect 
          value={statusFilter} 
          onChange={setStatusFilter} 
          options={[
            { value: 'All', label: 'สถานะทั้งหมด' },
            { value: 'Borrowed', label: 'กำลังยืม' },
            { value: 'Returned', label: 'คืนแล้ว' }
          ]}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/30">
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">การทำรายการ</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-500">รายละเอียดอุปกรณ์</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-500 text-center">จำนวน</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">รหัสงาน & ผู้ทำรายการ</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">ระยะเวลา</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">สถานะ</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-500 text-right whitespace-nowrap">จัดการ</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan="7" className="px-6 py-4"><div className="h-10 bg-zinc-100 rounded-lg w-full"></div></td>
                  </tr>
                ))
              ) : filteredTransactions.length > 0 ? (
                filteredTransactions.map((t) => (
                  <tr key={t.id} className="group hover:bg-zinc-50 transition-colors border-b border-zinc-50 last:border-0">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Hash size={14} className="text-zinc-400" />
                        <span className="font-mono text-zinc-900 font-medium">{t.transactionId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-zinc-900">{t.itemName}</span>
                        <span className="text-xs text-zinc-500 font-mono mt-0.5">{t.itemCode}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-md bg-zinc-100 text-zinc-700 font-medium text-xs">
                        {t.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-zinc-800">{t.jobId || '-'}</span>
                        <span className="text-xs text-zinc-500 mt-0.5">โดย {t.recorderName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                          <Calendar size={12} className="text-zinc-400" />
                          <span className="w-12 text-zinc-400">ยืม:</span>
                          <span className="font-mono">{formatDate(t.borrowDate)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                          <AlertCircle size={12} className="text-zinc-400" />
                          <span className="w-12 text-zinc-400">กำหนดคืน:</span>
                          <span className="font-mono">{formatDate(t.dueDate)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {t.status === 'Borrowed' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200/60 uppercase tracking-wide">
                          <Clock size={12} strokeWidth={2.5}/> กำลังยืม
                        </span>
                      ) : t.status === 'Returned' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 uppercase tracking-wide">
                          <CheckCircle2 size={12} strokeWidth={2.5}/> คืนแล้ว
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-zinc-100 text-zinc-600 border border-zinc-200/60 uppercase tracking-wide">
                          {t.status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {t.status?.toLowerCase() === 'borrowed' && (
                        <button 
                          onClick={() => setReturningTransaction(t)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 text-zinc-600 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 rounded-lg text-xs font-medium transition-all shadow-sm"
                          title="คืนอุปกรณ์"
                        >
                          <Undo2 size={14} /> 
                          <span className="hidden sm:inline">คืน</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center justify-center text-zinc-400">
                      <Search size={32} strokeWidth={1} className="mb-2 opacity-50"/>
                      <p className="text-sm text-zinc-500 font-medium">ไม่พบประวัติการทำรายการ</p>
                      <p className="text-xs mt-1">ลองปรับการค้นหาหรือตัวกรองของคุณ</p>
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