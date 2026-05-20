import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowDownToLine, ArrowUpFromLine, Search, Package, User,
  Hash, Clock, X, Loader2, CheckCircle2, FileText,
  ArrowDownLeft, ArrowUpRight, Calendar, Trash2, Filter, ChevronDown, Check, RefreshCcw, Briefcase, Plus, AlertTriangle, AlertOctagon, ShoppingCart, ClipboardCheck, History, FileMinus, Ban, ArrowLeft, FileX
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { request } from '../utils/fetchUtils';
import { useToast } from '../context/ToastContext';

function cn(...inputs) { return twMerge(clsx(inputs)); }

const ANIMATION_CLASSES = "transform transition-all duration-200 ease-out will-change-[transform,opacity]";

// --- COMPONENT: CUSTOM FILTER DROPDOWN ---
const CustomFilterDropdown = ({ value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full sm:w-56 shrink-0" ref={ref}>
      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 z-10 pointer-events-none" size={16} />
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className={cn(
          "w-full h-11 pl-10 pr-8 rounded-xl text-sm flex items-center cursor-pointer transition-all border", 
          isOpen ? "bg-white border-zinc-300 ring-2 ring-zinc-900/10" : "bg-zinc-50 border-zinc-200 hover:bg-zinc-100"
        )}
      >
        <span className={cn("truncate font-medium", value ? "text-zinc-900" : "text-zinc-600")}>{value || placeholder}</span>
        <ChevronDown className={cn("absolute right-3 text-zinc-400 transition-transform pointer-events-none", isOpen && "rotate-180")} size={14}/>
      </div>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-zinc-100 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100 py-1">
          <div onClick={() => {onChange(""); setIsOpen(false)}} className={cn("px-3 py-2.5 text-sm cursor-pointer hover:bg-zinc-50 flex items-center justify-between transition-colors", !value ? "text-zinc-900 font-bold bg-zinc-50" : "text-zinc-600")}>
            {placeholder} {!value && <Check size={14} className="text-zinc-900"/>}
          </div>
          {options.map(opt => (
            <div key={opt} onClick={() => {onChange(opt); setIsOpen(false)}} className={cn("px-3 py-2.5 text-sm cursor-pointer hover:bg-zinc-50 flex items-center justify-between transition-colors", value === opt ? "text-zinc-900 font-bold bg-zinc-50" : "text-zinc-600")}>
              {opt} {value === opt && <Check size={14} className="text-zinc-900"/>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- 1. ITEM SELECTOR MODAL ---
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

  const categories = [...new Set(safeData.map(item => item.category).filter(Boolean))].sort();

  if (!isMounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
      <div className={cn("fixed inset-0 bg-zinc-900/50 backdrop-blur-sm transition-opacity duration-200 ease-out", isVisible ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <div className={cn("relative bg-white w-full max-w-3xl h-[80vh] rounded-2xl shadow-2xl border border-zinc-100 flex flex-col", ANIMATION_CLASSES, isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4")}>
        <div className="px-4 sm:px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/80 rounded-t-2xl">
          <div><h3 className="text-lg font-semibold text-zinc-900">เลือกอุปกรณ์</h3><p className="text-sm text-zinc-500">ค้นหาและเลือกอุปกรณ์จากคลัง</p></div>
          <button onClick={onClose} className="p-2 -mr-2 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-900 rounded-full transition-colors"><X size={20}/></button>
        </div>
        
        <div className="p-4 border-b border-zinc-100 flex flex-col sm:flex-row gap-3 bg-white shadow-sm z-10 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input type="text" placeholder="ค้นหาด้วยรหัสหรือชื่ออุปกรณ์..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full h-11 pl-10 pr-4 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300 transition-all" autoFocus />
          </div>
          <CustomFilterDropdown value={categoryFilter} onChange={setCategoryFilter} options={categories} placeholder="ทุกหมวดหมู่" />
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar bg-zinc-50/30">
          <table className="w-full text-left text-sm border-collapse min-w-[500px]">
            <thead className="bg-white text-zinc-500 font-medium uppercase text-xs sticky top-0 z-10 shadow-sm border-b border-zinc-100">
              <tr><th className="px-4 sm:px-6 py-3 whitespace-nowrap">รหัส</th><th className="px-4 sm:px-6 py-3 whitespace-nowrap">ชื่อ</th><th className="px-4 sm:px-6 py-3 whitespace-nowrap">หมวดหมู่</th><th className="px-4 sm:px-6 py-3 text-right whitespace-nowrap">คงเหลือ</th><th className="px-4 sm:px-6 py-3 text-center whitespace-nowrap">จัดการ</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredData.length > 0 ? (
                filteredData.map((item) => {
                  const isDraft = item.itemCode?.toUpperCase().startsWith('DRAFT-');
                  return (
                    <tr key={item.itemCode} className="hover:bg-zinc-50 group transition-colors bg-white">
                      <td className="px-4 sm:px-6 py-3 font-mono text-zinc-500 font-medium">{item.itemCode}</td>
                      <td className="px-4 sm:px-6 py-3 text-zinc-900 min-w-[120px]">{item.name}</td>
                      <td className="px-4 sm:px-6 py-3 text-zinc-500">{item.category}</td>
                      <td className="px-4 sm:px-6 py-3 text-right font-bold text-zinc-700">{item.balance} <span className="text-[10px] font-normal text-zinc-400">{item.unit}</span></td>
                      <td className="px-4 sm:px-6 py-3 text-center">
                        <button disabled={isDraft} onClick={() => { onSelect(item); onClose(); }} className={cn("px-4 py-1.5 text-xs font-medium rounded-lg transition-all shadow-sm whitespace-nowrap", isDraft ? "bg-zinc-100 text-zinc-400 cursor-not-allowed" : "bg-zinc-900 text-white hover:bg-zinc-700 active:scale-95")}>
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
        <div className="px-4 sm:px-6 py-3 bg-white border-t border-zinc-100 text-xs text-zinc-400 flex justify-between rounded-b-2xl shrink-0">
          <span>แสดง {filteredData.length} รายการ</span><span className="hidden sm:inline">กด ESC เพื่อปิด</span>
        </div>
      </div>
    </div>,
    document.body
  );
};

// --- 2. CREATE REQUEST MODAL ---
const TransactionModal = ({ isOpen, type, onClose, onSuccess }) => {
  const [activeType, setActiveType] = useState(type); // 'PR' | 'WITHDRAW'
  const [items, setItems] = useState([{ itemCode: '', itemName: '', jobNo: '', quantity: 1, currentStock: 0, unit: '', note: '' }]);
  const [inventoryData, setInventoryData] = useState([]); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickingRowIndex, setPickingRowIndex] = useState(null);
  
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen && type) setActiveType(type);
  }, [isOpen, type]);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      setItems([{ itemCode: '', itemName: '', jobNo: '', quantity: 1, currentStock: 0, unit: '', note: '' }]);
      
      request('/api/stocks/overview').then(res => {
        setInventoryData(Array.isArray(res) ? res : (res?.data || []));
      }).catch(err => console.error("Failed to load stock data", err));

      requestAnimationFrame(() => requestAnimationFrame(() => setIsVisible(true)));
    } else {
      setIsVisible(false);
      setTimeout(() => setIsMounted(false), 200);
    }
  }, [isOpen]);

  const handleOpenPicker = (index) => { setPickingRowIndex(index); setIsPickerOpen(true); };
  
  const handleSelectItem = (item) => {
    if (pickingRowIndex !== null) {
      const newItems = [...items];
      newItems[pickingRowIndex] = { 
        ...newItems[pickingRowIndex], 
        itemCode: item.itemCode, 
        itemName: item.name, 
        currentStock: item.balance, 
        unit: item.unit
      };
      setItems(newItems);
    }
  };

  const handleFieldChange = (index, field, val) => {
    const newItems = [...items];
    newItems[index][field] = val;
    setItems(newItems);
  };

  const handleAddItem = () => setItems([...items, { itemCode: '', itemName: '', jobNo: '', quantity: 1, currentStock: 0, unit: '', note: '' }]);
  const handleRemoveItem = (index) => setItems(items.filter((_, i) => i !== index));
  
  const isValid = items.every(item => item.itemCode && Number(item.quantity) > 0 && item.jobNo.trim() !== "");
  
  const handleSubmit = async () => {
    if (!isValid) return;
    setIsSubmitting(true);
    try {
      const endpoint = activeType === 'PR' 
        ? '/api/transactions/purchase/request' 
        : '/api/transactions/withdraw/request';
        
      const payload = items.map(item => ({ 
        itemCode: item.itemCode, 
        jobNo: item.jobNo.trim(), 
        quantity: Number(item.quantity), 
        note: item.note || "" 
      }));
      
      await request(endpoint, { method: 'POST', body: JSON.stringify(payload) });
      onSuccess(`สร้างรายการ${activeType === 'PR' ? 'ขอซื้อ' : 'ขอเบิก'}สำเร็จ`, "success");
      onClose();
    } catch (error) {
      onSuccess(`ทำรายการไม่สำเร็จ`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <div className={cn("fixed inset-0 bg-zinc-900/50 backdrop-blur-sm transition-opacity duration-200 ease-out", isVisible ? "opacity-100" : "opacity-0")} onClick={onClose} />
        <div className={cn("relative bg-white w-full max-w-3xl p-0 rounded-2xl shadow-2xl border border-zinc-100 flex flex-col overflow-hidden max-h-[90vh]", ANIMATION_CLASSES, isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4")}>
          <div className={cn(
            "px-4 sm:px-6 py-4 flex items-center justify-between border-b shrink-0",
            activeType === 'PR' ? "bg-emerald-50/50 border-emerald-100" : "bg-amber-50/50 border-amber-100"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn("p-2.5 rounded-xl hidden sm:block", activeType === 'PR' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                {activeType === 'PR' ? <ShoppingCart size={24} /> : <ArrowUpRight size={24} />}
              </div>
              <div>
                <h2 className={cn("text-lg font-semibold", activeType === 'PR' ? "text-emerald-900" : "text-amber-900")}>
                  {activeType === 'PR' ? 'สร้างใบคำขอซื้อ (PR)' : 'สร้างใบคำขอเบิกอุปกรณ์'}
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500">
                  {activeType === 'PR' ? 'ทำรายการขอจัดซื้ออุปกรณ์เข้าคลัง' : 'ทำรายการขอเบิกอุปกรณ์ออกจากคลัง'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 -mr-2 text-zinc-400 hover:text-zinc-900 hover:bg-white rounded-full transition-colors"><X size={20} /></button>
          </div>
          
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar bg-zinc-50/30 flex-1">
            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-2"><Calendar size={14} /><span>วันที่: <span className="text-zinc-900 font-medium">{new Date().toLocaleDateString('th-TH')}</span></span></div>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex flex-col gap-3 p-4 bg-white rounded-xl border border-zinc-200 shadow-sm group transition-all hover:border-zinc-300">
                  <div className="flex items-start gap-3 w-full">
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">รหัสอุปกรณ์</label>
                      <div className="relative flex gap-2">
                        <div onClick={() => handleOpenPicker(index)} className={cn("flex-1 h-10 px-3 border rounded-lg text-sm flex items-center cursor-pointer transition-all hover:border-zinc-400 hover:shadow-sm truncate", !item.itemCode ? "text-zinc-400 border-zinc-200 border-dashed bg-zinc-50" : "text-zinc-900 border-zinc-300 font-medium bg-white")}>
                            {item.itemCode ? `${item.itemCode} - ${item.itemName}` : "คลิกเพื่อค้นหาอุปกรณ์..."}
                        </div>
                        <button onClick={() => handleOpenPicker(index)} className="h-10 w-10 shrink-0 flex items-center justify-center bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 text-zinc-600 rounded-lg transition-colors"><Search size={16} /></button>
                      </div>
                      {item.itemCode && (<p className="text-[10px] text-zinc-400 mt-1 pl-1 flex items-center gap-1.5">คงเหลือปัจจุบัน: <span className="font-bold text-zinc-700">{item.currentStock} {item.unit}</span></p>)}
                    </div>
                    <div className="w-10 pt-5">
                      <button onClick={() => handleRemoveItem(index)} disabled={items.length === 1} className="h-10 w-10 flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400"><Trash2 size={18} /></button>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full mt-1">
                    <div className="w-full sm:w-1/3 space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex justify-between">รหัสงาน <span className="text-red-400">*</span></label>
                      <input type="text" required placeholder="เช่น JOB-001" value={item.jobNo} onChange={(e) => handleFieldChange(index, 'jobNo', e.target.value)} className={cn("w-full h-10 px-3 bg-white border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 transition-all", activeType === 'PR' ? "focus:ring-emerald-500/20 focus:border-emerald-400" : "focus:ring-amber-500/20 focus:border-amber-400")} />
                    </div>
                    <div className="w-full sm:w-1/4 space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex justify-between">จำนวน <span className="text-red-400">*</span></label>
                      <input type="number" min="1" required value={item.quantity} onChange={(e) => handleFieldChange(index, 'quantity', e.target.value)} className={cn("w-full h-10 px-3 bg-white border border-zinc-200 rounded-lg text-sm text-center outline-none focus:ring-2 transition-all", activeType === 'PR' ? "focus:ring-emerald-500/20 focus:border-emerald-400" : "focus:ring-amber-500/20 focus:border-amber-400")} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">หมายเหตุ <span className="text-zinc-300 normal-case font-normal">(ไม่บังคับ)</span></label>
                      <input type="text" placeholder="ระบุเหตุผลเพิ่มเติม..." value={item.note} onChange={(e) => handleFieldChange(index, 'note', e.target.value)} className={cn("w-full h-10 px-3 bg-white border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 transition-all placeholder:text-zinc-300", activeType === 'PR' ? "focus:ring-emerald-500/20 focus:border-emerald-400" : "focus:ring-amber-500/20 focus:border-amber-400")} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleAddItem} className="w-full py-3 border-2 border-dashed border-zinc-200 rounded-xl text-zinc-500 hover:text-zinc-900 hover:border-zinc-400 hover:bg-white transition-all flex items-center justify-center gap-2 text-sm font-bold bg-zinc-50"><Plus size={16} /> เพิ่มรายการอุปกรณ์</button>
          </div>
          <div className="p-4 sm:p-6 border-t border-zinc-100 bg-white flex gap-3 shrink-0">
            <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-bold hover:bg-zinc-50 transition-all">ยกเลิก</button>
            <button onClick={handleSubmit} disabled={!isValid || isSubmitting} className={cn("flex-1 h-11 text-white rounded-xl text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2", activeType === 'PR' ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100" : "bg-amber-600 hover:bg-amber-700 shadow-amber-100", (!isValid || isSubmitting) && "opacity-50 cursor-not-allowed shadow-none")}>
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : (activeType === 'PR' ? <ShoppingCart size={16} /> : <ArrowUpRight size={16} />)}
              ส่งคำขอ
            </button>
          </div>
        </div>
      </div>
      <ItemSelectorModal isOpen={isPickerOpen} onClose={() => setIsPickerOpen(false)} onSelect={handleSelectItem} data={inventoryData} />
    </>,
    document.body
  );
};

// --- 3. APPROVE WITHDRAW MODAL ---
const ApproveWithdrawModal = ({ isOpen, onClose, onSuccess, approveItem }) => {
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen && approveItem) {
      setIsMounted(true);
      setNote('');
      requestAnimationFrame(() => requestAnimationFrame(() => setIsVisible(true)));
    } else {
      setIsVisible(false);
      setTimeout(() => setIsMounted(false), 200);
    }
  }, [isOpen, approveItem]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await request('/api/transactions/withdraw/approve', { 
        method: 'POST', 
        body: JSON.stringify({ 
          transactionNo: approveItem.transactionNo,
          note: note 
        }) 
      });
      onSuccess("อนุมัติการเบิกจ่ายสำเร็จ", "success");
      onClose();
    } catch (error) {
      onSuccess(error.message || `อนุมัติไม่สำเร็จ`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted || !approveItem) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className={cn("fixed inset-0 bg-zinc-900/50 backdrop-blur-sm transition-opacity duration-200 ease-out", isVisible ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <div className={cn("relative bg-white w-full max-w-lg p-0 rounded-2xl shadow-2xl border border-zinc-100 flex flex-col overflow-hidden", ANIMATION_CLASSES, isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-8")}>
        <div className="px-6 py-4 flex items-center justify-between border-b bg-amber-50/50 border-amber-100">
          <div>
            <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2 text-amber-900">
              <ClipboardCheck size={20} className="text-amber-600" />
              อนุมัติการเบิกจ่าย
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">ยืนยันการอนุมัติคำขอเบิกอุปกรณ์</p>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 text-zinc-400 hover:text-zinc-900 hover:bg-white rounded-full transition-colors"><X size={20} strokeWidth={1.5} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-6 space-y-4">
            <div className="bg-zinc-50 border border-zinc-100 p-4 rounded-xl space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-zinc-200/60">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">เลขที่รายการ</span>
                <span className="font-mono text-zinc-900 font-bold">{approveItem.transactionNo}</span>
              </div>
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">อุปกรณ์</span>
                  <span className="font-mono text-zinc-700 font-bold mt-1">{approveItem.itemCode}</span>
                  <span className="text-sm text-zinc-900 font-medium">{approveItem.itemName}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">จำนวน</span>
                  <div className="text-lg font-extrabold text-amber-600 mt-1">{approveItem.pendingAmount}</div>
                </div>
              </div>
              <div className="pt-2 border-t border-zinc-200/60 flex items-center justify-between text-xs">
                <span className="text-zinc-500">รหัสงาน: <span className="font-bold text-zinc-700">{approveItem.jobNo || '-'}</span></span>
                <span className="text-zinc-500 flex items-center gap-1"><User size={12}/> ผู้เบิก: <span className="font-bold text-zinc-700">{approveItem.recordedBy || '-'}</span></span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">หมายเหตุอนุมัติ (ถ้ามี)</label>
              <input 
                type="text" 
                placeholder="ระบุข้อความเพิ่มเติม..." 
                value={note} 
                onChange={e => setNote(e.target.value)} 
                className="w-full h-11 px-3 bg-white border border-zinc-200 rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400" 
              />
            </div>
          </div>
          <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-bold hover:bg-white transition-all">ยกเลิก</button>
            <button type="submit" disabled={isSubmitting} className={cn("flex-1 h-11 text-white rounded-xl text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 shadow-amber-100", isSubmitting && "opacity-50 cursor-not-allowed shadow-none")}>
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              ยืนยันอนุมัติ
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

// --- 4. PENDING RECEIVE MODAL ---
const PendingReceiveModal = ({ isOpen, onClose, onSuccess, pendingItem }) => {
  const [receiveList, setReceiveList] = useState([]); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [mode, setMode] = useState('RECEIVE'); 

  useEffect(() => {
    if (isOpen && pendingItem) {
      setIsMounted(true);
      setMode('RECEIVE'); 
      setReceiveList([{
        itemCode: pendingItem.itemCode,
        itemName: pendingItem.itemName,
        jobNo: pendingItem.jobNo || '-', 
        withdrawnQty: pendingItem.pendingAmount,
        receiveQty: pendingItem.pendingAmount,
        note: ''
      }]);
      requestAnimationFrame(() => requestAnimationFrame(() => setIsVisible(true)));
    } else {
      setIsVisible(false);
      setTimeout(() => setIsMounted(false), 200);
    }
  }, [isOpen, pendingItem]);

  const updateField = (index, field, value) => {
    const newList = [...receiveList];
    newList[index][field] = value;
    setReceiveList(newList);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const item = receiveList[0]; 
      if (mode === 'RECEIVE') {
        const payload = [{
          itemCode: item.itemCode,
          jobNo: item.jobNo === '-' ? '' : item.jobNo,
          quantity: Number(item.receiveQty),
          note: item.note
        }];
        await request('/api/transactions/receive', { method: 'POST', body: JSON.stringify(payload) });
        onSuccess("รับเข้าอุปกรณ์สำเร็จ", "success");
      } 
      else if (mode === 'WRITEOFF') {
        const payload = {
          itemCode: item.itemCode,
          jobNo: item.jobNo === '-' ? '' : item.jobNo,
          quantity: Number(item.receiveQty),
          note: item.note
        };
        await request('/api/transactions/write-off', { method: 'POST', body: JSON.stringify(payload) });
        onSuccess("ตัดจำหน่ายอุปกรณ์สำเร็จ", "success");
      }
      onClose();
    } catch (error) {
      onSuccess(error.message || `ทำรายการไม่สำเร็จ`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormInvalid = receiveList.some(i => !i.receiveQty || Number(i.receiveQty) <= 0 || (mode === 'WRITEOFF' && !i.note.trim()));
  
  if (!isMounted || !pendingItem) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className={cn("fixed inset-0 bg-zinc-900/50 backdrop-blur-sm transition-opacity duration-200 ease-out", isVisible ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <div className={cn("relative bg-white w-full max-w-2xl p-0 rounded-2xl shadow-2xl border border-zinc-100 flex flex-col max-h-[90vh] overflow-hidden", ANIMATION_CLASSES, isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-8")}>
        <div className={cn("px-4 sm:px-6 py-4 flex items-center justify-between border-b transition-colors duration-300 shrink-0", mode === 'RECEIVE' ? "bg-emerald-50/50 border-emerald-100" : "bg-orange-50/50 border-orange-100")}>
          <div>
            <h2 className={cn("text-lg font-semibold tracking-tight flex items-center gap-2", mode === 'RECEIVE' ? "text-emerald-900" : "text-orange-900")}>
              {mode === 'RECEIVE' ? <ArrowDownToLine size={20} className="text-emerald-600" /> : <FileMinus size={20} className="text-orange-600" />}
              {mode === 'RECEIVE' ? 'รับเข้าอุปกรณ์' : 'ตัดจำหน่ายอุปกรณ์ (Write-off)'}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5 hidden sm:block">
              {mode === 'RECEIVE' ? 'ยืนยันการรับเข้าอุปกรณ์' : 'ตัดอุปกรณ์นี้ออกจากรายการเนื่องจากชำรุด สูญหาย หรืออื่น ๆ'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 text-zinc-400 hover:text-zinc-900 hover:bg-white rounded-full transition-colors"><X size={20} strokeWidth={1.5} /></button>
        </div>
        <div className="px-4 sm:px-6 pt-4 flex gap-2 border-b border-zinc-100 bg-zinc-50/30 shrink-0">
          <button type="button" onClick={() => setMode('RECEIVE')} className={cn("px-4 py-2 text-sm font-bold border-b-2 transition-all", mode === 'RECEIVE' ? "border-emerald-600 text-emerald-700" : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300")}>รับเข้าปกติ</button>
          <button type="button" onClick={() => setMode('WRITEOFF')} className={cn("px-4 py-2 text-sm font-bold border-b-2 transition-all", mode === 'WRITEOFF' ? "border-orange-500 text-orange-600" : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300")}>ตัดจำหน่าย</button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden flex-1">
          <div className="space-y-4 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-zinc-50/30">
            {mode === 'WRITEOFF' && (
               <div className="p-3 bg-orange-50 text-orange-800 rounded-xl border border-orange-100 flex items-start gap-3 text-xs leading-relaxed">
                 <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                 <p><b>การตัดจำหน่าย (Write-off):</b> ใช้ในกรณีที่อุปกรณ์ชำรุด สูญหาย หรือไม่มีการผลิตแล้ว โดยจะทำการตัดออกจากรายการ <b>กรุณาระบุหมายเหตุให้ชัดเจน</b></p>
               </div>
            )}
            {receiveList.map((item, index) => (
              <div key={index} className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-5 flex flex-col gap-4 shadow-sm">
                <div className="flex justify-between items-start border-b border-zinc-100 pb-3">
                  <div>
                     <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                       <span className="font-mono font-extrabold text-zinc-900 text-base">{item.itemCode}</span>
                       <span className="text-xs text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md inline-flex w-fit">{item.itemName || 'ไม่ทราบชื่ออุปกรณ์'}</span>
                     </div>
                     {pendingItem?.recordedBy && (
                       <div className="flex items-center gap-1.5 mt-2 text-[11px] text-zinc-500">
                         <User size={12} className="text-zinc-400" /><span>ผู้บันทึก: <span className="font-medium text-zinc-700">{pendingItem.recordedBy}</span></span>
                       </div>
                     )}
                  </div>
                  <div className="text-xs font-bold text-zinc-600 bg-zinc-100 px-2.5 py-1.5 rounded-lg border border-zinc-200 shrink-0 text-center">
                    ยอดค้าง<br className="sm:hidden"/><span className="hidden sm:inline">รับ</span>: {item.withdrawnQty}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-1/3">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">รหัสงาน</label>
                    <input type="text" readOnly value={item.jobNo} className="w-full h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-500 cursor-not-allowed outline-none font-medium" />
                  </div>
                  <div className="w-full sm:w-1/4">
                    <label className={cn("text-[10px] font-bold uppercase tracking-wider block mb-1.5", mode === 'RECEIVE' ? "text-emerald-600" : "text-orange-600")}>
                      จำนวนที่{mode === 'RECEIVE' ? 'รับ' : 'ตัด'} <span className="text-red-400">*</span>
                    </label>
                    <input type="number" required min="1" value={item.receiveQty} onChange={e => updateField(index, 'receiveQty', e.target.value)} className={cn("w-full h-10 px-3 bg-white border border-zinc-200 rounded-lg text-sm text-center outline-none transition-all focus:ring-2", mode === 'RECEIVE' ? "focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-emerald-700" : "focus:ring-orange-500/20 focus:border-orange-500 text-orange-600 font-bold")} />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                      หมายเหตุ {mode === 'WRITEOFF' ? <span className="text-orange-600 normal-case">(บังคับ)</span> : <span className="text-zinc-300 normal-case">(ไม่บังคับ)</span>}
                    </label>
                    <input type="text" required={mode === 'WRITEOFF'} placeholder={mode === 'WRITEOFF' ? "ระบุสาเหตุการตัดจำหน่าย..." : "ระบุรายละเอียดสภาพอุปกรณ์..."} value={item.note} onChange={e => updateField(index, 'note', e.target.value)} className={cn("w-full h-10 px-3 bg-white border border-zinc-200 rounded-lg text-sm outline-none transition-all focus:ring-2", mode === 'RECEIVE' ? "focus:ring-emerald-500/20 focus:border-emerald-500" : "focus:ring-orange-500/20 focus:border-orange-500")} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 sm:p-6 border-t border-zinc-100 bg-white flex gap-3 shrink-0">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-bold hover:bg-zinc-50 transition-all">ยกเลิก</button>
            <button type="submit" disabled={isSubmitting || isFormInvalid} className={cn("flex-[2] sm:flex-1 h-11 text-white rounded-xl text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2", mode === 'RECEIVE' ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100" : "bg-orange-600 hover:bg-orange-700 shadow-orange-100", (!isFormInvalid && !isSubmitting) ? "active:scale-95" : "opacity-50 cursor-not-allowed shadow-none")}>
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : (mode === 'RECEIVE' ? <CheckCircle2 size={16} /> : <FileMinus size={16} />)}
              {mode === 'RECEIVE' ? 'ยืนยันการรับเข้า' : 'ยืนยันการตัดจำหน่าย'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

// --- 5. WRITE-OFF SUMMARY MODAL ---
const WriteOffSummaryModal = ({ isOpen, onClose }) => {
  const [summaryData, setSummaryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      fetchSummary();
      setSearchQuery('');
      requestAnimationFrame(() => requestAnimationFrame(() => setIsVisible(true)));
    } else {
      setIsVisible(false);
      setTimeout(() => setIsMounted(false), 200);
    }
  }, [isOpen]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await request('/api/transactions/write-off/summary');
      setSummaryData(Array.isArray(res) ? res : (res?.data || []));
    } catch (error) {
      console.error("Failed to load write-off summary", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    return summaryData.filter(item => {
      const q = searchQuery.toLowerCase();
      return item.itemCode?.toLowerCase().includes(q) || item.itemName?.toLowerCase().includes(q) || item.category?.toLowerCase().includes(q) || item.recordedBy?.toLowerCase().includes(q) || item.actionBy?.toLowerCase().includes(q);     
    });
  }, [summaryData, searchQuery]);

  if (!isMounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
      <div className={cn("fixed inset-0 bg-zinc-900/50 backdrop-blur-sm transition-opacity duration-200 ease-out", isVisible ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <div className={cn("relative bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl border border-zinc-100 flex flex-col overflow-hidden", ANIMATION_CLASSES, isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4")}>
        <div className="px-4 sm:px-6 py-4 flex items-center justify-between border-b bg-orange-50/50 border-orange-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-100 text-orange-700 hidden sm:block"><FileMinus size={24} /></div>
            <div><h2 className="text-lg font-bold text-orange-900">ประวัติการตัดจำหน่าย (Write-off)</h2><p className="text-xs sm:text-sm text-zinc-500">สรุปยอดอุปกรณ์ที่ชำรุด สูญหาย หรือถูกนำออกจากระบบถาวร</p></div>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 text-zinc-400 hover:bg-white hover:text-zinc-900 rounded-full transition-colors"><X size={20} /></button>
        </div>
        <div className="p-4 border-b border-zinc-100 bg-white shrink-0">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input type="text" placeholder="ค้นหารหัส, ชื่อ, หมวดหมู่ หรือผู้ทำรายการ..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full h-10 pl-9 pr-4 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-900/10 focus:border-orange-300 transition-all focus:bg-white" />
          </div>
        </div>
        <div className="flex-1 overflow-x-auto custom-scrollbar bg-zinc-50/30">
          <table className="w-full text-left text-sm border-collapse min-w-[900px]">
            <thead className="bg-white text-zinc-500 font-medium uppercase text-[11px] tracking-wider sticky top-0 z-10 shadow-sm border-b border-zinc-100">
              <tr><th className="px-4 sm:px-6 py-4 whitespace-nowrap">รายละเอียดอุปกรณ์</th><th className="px-4 sm:px-6 py-4 text-center whitespace-nowrap">ยอดรวมที่ตัด</th><th className="px-4 sm:px-6 py-4 whitespace-nowrap">ผู้ทำรายการ (เบิก / ตัด)</th><th className="px-4 sm:px-6 py-4 text-right whitespace-nowrap">ตัดล่าสุดเมื่อ</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                [...Array(5)].map((_, i) => <tr key={i} className="animate-pulse"><td colSpan="4" className="px-6 py-4"><div className="h-10 bg-zinc-100 rounded-lg w-full"></div></td></tr>)
              ) : filteredData.length > 0 ? (
                filteredData.map((item, index) => (
                  <tr key={index} className="hover:bg-orange-50/30 transition-colors bg-white group">
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                           <span className="font-mono text-zinc-700 font-bold">{item.itemCode}</span>
                           <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-100 text-zinc-600 border border-zinc-200/50">
                             {item.category}
                           </span>
                        </div>
                        <span className="text-zinc-900 text-sm font-medium">{item.itemName}</span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center min-w-[32px] h-8 px-2.5 rounded-lg bg-orange-50 text-orange-700 font-extrabold text-sm border border-orange-100 shadow-sm">{item.totalWriteOff}</span>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex flex-col gap-1.5 text-xs">
                        <div className="flex items-center gap-1.5 text-zinc-600"><span className="w-10 text-zinc-400 font-medium">ผู้เบิก:</span><span className="font-medium bg-zinc-100 px-2 py-0.5 rounded truncate max-w-[120px]" title={item.recordedBy}>{item.recordedBy || '-'}</span></div>
                        <div className="flex items-center gap-1.5 text-orange-600"><span className="w-10 text-orange-400 font-medium">ผู้ตัด:</span><span className="font-medium bg-orange-50 px-2 py-0.5 rounded truncate max-w-[120px]" title={item.actionBy}>{item.actionBy || '-'}</span></div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right"><span className="text-xs text-zinc-500 font-mono bg-zinc-50 px-2 py-1 rounded border border-zinc-100">{item.lastWriteOffDate}</span></td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="4" className="h-[40vh] bg-transparent p-0"><div className="flex flex-col items-center justify-center h-full text-zinc-400 w-full absolute left-0"><FileMinus size={40} className="opacity-20 mb-3" /><p className="text-sm font-medium text-zinc-500">ไม่พบประวัติการตัดจำหน่าย</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>,
    document.body
  );
};


// --- 6. TRANSACTION HISTORY MODAL (ดูประวัติทั้งหมด) ---
const TransactionHistoryModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('PR');
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      fetchHistory(activeTab);
      setSearchQuery('');
      requestAnimationFrame(() => requestAnimationFrame(() => setIsVisible(true)));
    } else {
      setIsVisible(false);
      setTimeout(() => setIsMounted(false), 200);
    }
  }, [isOpen, activeTab]);

  const fetchHistory = async (tab) => {
    setLoading(true);
    try {
      const endpoint = tab === 'PR' ? '/api/transactions/purchase/history' : '/api/transactions/withdraw/history';
      const res = await request(endpoint);
      setHistoryData(Array.isArray(res) ? res : (res?.data || []));
    } catch (error) {
      console.error("Failed to load history", error);
      setHistoryData([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    return historyData.filter(item => {
      const q = searchQuery.toLowerCase();
      return item.transactionNo?.toLowerCase().includes(q) || 
             item.itemCode?.toLowerCase().includes(q) || 
             item.itemName?.toLowerCase().includes(q) || 
             item.jobNo?.toLowerCase().includes(q) || 
             item.createdBy?.toLowerCase().includes(q);     
    });
  }, [historyData, searchQuery]);

  if (!isMounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
      <div className={cn("fixed inset-0 bg-zinc-900/50 backdrop-blur-sm transition-opacity duration-200 ease-out", isVisible ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <div className={cn("relative bg-white w-full max-w-6xl h-[85vh] rounded-2xl shadow-2xl border border-zinc-100 flex flex-col overflow-hidden", ANIMATION_CLASSES, isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4")}>
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 flex items-center justify-between border-b bg-blue-50/50 border-blue-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700 hidden sm:block"><History size={24} /></div>
            <div>
              <h2 className="text-lg font-bold text-blue-900">ประวัติการทำรายการ (History)</h2>
              <p className="text-xs sm:text-sm text-zinc-500">ตรวจสอบประวัติการขอซื้อเข้าคลัง และการเบิกจ่ายอุปกรณ์</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 text-zinc-400 hover:bg-white hover:text-zinc-900 rounded-full transition-colors"><X size={20} /></button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-zinc-100 bg-white shrink-0 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex p-1 bg-zinc-100 rounded-xl w-full sm:w-auto shrink-0">
            <button onClick={() => setActiveTab('PR')} className={cn("flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200", activeTab === 'PR' ? "bg-white text-emerald-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700")}>
              <ShoppingCart size={16} /> ประวัติขอซื้อ
            </button>
            <button onClick={() => setActiveTab('WITHDRAW')} className={cn("flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200", activeTab === 'WITHDRAW' ? "bg-white text-amber-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700")}>
              <ArrowUpRight size={16} /> ประวัติเบิกจ่าย
            </button>
          </div>
          <div className="relative w-full sm:w-80 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input type="text" placeholder="ค้นหาเลขที่รายการ, รหัส, ชื่อ, รหัสงาน..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full h-10 pl-9 pr-4 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/10 focus:border-blue-300 transition-all focus:bg-white" />
          </div>
        </div>

        {/* Table Area */}
        <div className="flex-1 overflow-x-auto custom-scrollbar bg-zinc-50/30">
          <table className="w-full text-left text-sm border-collapse min-w-[1000px]">
            <thead className="bg-white text-zinc-500 font-medium uppercase text-[11px] tracking-wider sticky top-0 z-10 shadow-sm border-b border-zinc-100">
              <tr>
                <th className="px-4 py-4 whitespace-nowrap">เลขที่รายการ</th>
                <th className="px-4 py-4 whitespace-nowrap">รายละเอียดอุปกรณ์</th>
                <th className="px-4 py-4 whitespace-nowrap">รหัสงาน</th>
                <th className="px-4 py-4 text-center whitespace-nowrap">จำนวน</th>
                {activeTab === 'WITHDRAW' && <th className="px-4 py-4 text-center whitespace-nowrap">สถานะ</th>}
                <th className="px-4 py-4 whitespace-nowrap">{activeTab === 'PR' ? 'ผู้สร้าง / ผู้รับ' : 'ผู้เบิก / ผู้อนุมัติ'}</th>
                <th className="px-4 py-4 whitespace-nowrap">วันที่</th>
                <th className="px-4 py-4 whitespace-nowrap">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                [...Array(6)].map((_, i) => <tr key={i} className="animate-pulse"><td colSpan={activeTab === 'WITHDRAW' ? 8 : 7} className="px-4 py-4"><div className="h-10 bg-zinc-100 rounded-lg w-full"></div></td></tr>)
              ) : filteredData.length > 0 ? (
                filteredData.map((item, index) => (
                  <tr key={index} className="hover:bg-blue-50/30 transition-colors bg-white group">
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-mono font-bold text-zinc-700 bg-zinc-100 px-2 py-1 rounded border border-zinc-200 block truncate max-w-[140px]">{item.transactionNo}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-zinc-900 font-bold text-xs"><Hash size={12} className="inline text-zinc-400 mr-0.5"/>{item.itemCode}</span>
                        <span className="text-[11px] font-medium text-zinc-600 truncate max-w-[200px]">{item.itemName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-100 border border-zinc-200 text-[11px] font-bold text-zinc-700 truncate max-w-[100px]">
                        <Briefcase size={10} className="text-zinc-500 shrink-0"/>{item.jobNo || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-extrabold text-zinc-900">{item.quantity}</td>
                    
                    {activeTab === 'WITHDRAW' && (
                      <td className="px-4 py-3 text-center">
                        <span className="text-[10px] font-bold px-2 py-1 bg-zinc-100 border border-zinc-200 rounded text-zinc-700 whitespace-nowrap">{item.status || '-'}</span>
                      </td>
                    )}

                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 text-[11px]">
                        <div className="flex items-center gap-1.5"><User size={10} className="text-zinc-400"/> <span className="font-medium text-zinc-600 truncate max-w-[100px]">{item.createdBy || '-'}</span></div>
                        <div className="flex items-center gap-1.5"><CheckCircle2 size={10} className="text-emerald-500"/> <span className="font-medium text-emerald-700 truncate max-w-[100px]">{activeTab === 'PR' ? item.receivedBy || '-' : item.approvedBy || '-'}</span></div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-mono text-zinc-500 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100 whitespace-nowrap">{item.createdAt}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[10px] text-zinc-500 truncate max-w-[150px]" title={item.note}>{item.note || '-'}</div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={activeTab === 'WITHDRAW' ? 8 : 7} className="h-[40vh] bg-transparent p-0">
                    <div className="flex flex-col items-center justify-center h-full text-zinc-400 w-full absolute left-0">
                      <History size={40} className="opacity-20 mb-3" />
                      <p className="text-sm font-medium text-zinc-500">ไม่พบประวัติการทำรายการ</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>,
    document.body
  );
};


// --- 7. CANCEL REQUEST MODAL (2-Step Modal) ---
const CancelRequestModal = ({ isOpen, onClose, onSuccess, item, activeTab }) => {
  const [step, setStep] = useState(1);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      setIsMounted(true);
      setStep(1);
      setNote('');
      requestAnimationFrame(() => requestAnimationFrame(() => setIsVisible(true)));
    } else {
      setIsVisible(false);
      setTimeout(() => setIsMounted(false), 200);
    }
  }, [isOpen, item]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!note.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const endpoint = activeTab === 'PR' 
        ? '/api/transactions/purchase/cancel' 
        : '/api/transactions/withdraw/cancel';

      await request(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          transactionNo: item.transactionNo,
          note: note.trim()
        })
      });

      onSuccess("ยกเลิกคำขอสำเร็จ", "success");
      onClose();
    } catch (error) {
      onSuccess(error.message || "ยกเลิกคำขอไม่สำเร็จ", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted || !item) return null;

  return createPortal(
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 sm:p-6">
      <div className={cn("fixed inset-0 bg-zinc-900/60 backdrop-blur-sm transition-opacity duration-200", isVisible ? "opacity-100" : "opacity-0")} onClick={!isSubmitting ? onClose : undefined} />
      <div className={cn("relative bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300", isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-8")}>
        
        {step === 1 ? (
          // --- STEP 1: CONFIRMATION ---
          <div className="p-6 sm:p-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-5 ring-8 ring-red-50/50"><Ban size={32} strokeWidth={2} /></div>
            <h3 className="text-xl font-bold text-zinc-900 mb-2">ยืนยันการยกเลิกคำขอ?</h3>
            <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
              คุณกำลังจะยกเลิกคำขอเลขที่ <strong className="text-zinc-900">{item.transactionNo}</strong><br/>
              หากยกเลิกแล้วจะไม่สามารถกู้คืนหรือกลับมาดำเนินการต่อได้
            </p>
            <div className="flex w-full gap-3">
              <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-bold hover:bg-zinc-50 transition-colors">ยกเลิก (ปิด)</button>
              <button onClick={() => setStep(2)} className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold flex items-center justify-center transition-colors shadow-md shadow-red-200">ดำเนินการต่อ</button>
            </div>
          </div>
        ) : (
          // --- STEP 2: DETAILS & REASON ---
          <div className="flex flex-col h-full">
            <div className="px-6 py-4 flex items-center justify-between border-b bg-red-50/50 border-red-100 shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={() => setStep(1)} disabled={isSubmitting} className="p-1.5 -ml-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-white rounded-lg transition-colors"><ArrowLeft size={18} /></button>
                <div>
                  <h2 className="text-lg font-bold text-red-900">ระบุเหตุผลการยกเลิก</h2>
                  <p className="text-xs sm:text-sm text-red-600/80">ระบบบังคับให้กรอกเหตุผลประกอบการยกเลิก</p>
                </div>
              </div>
              <button onClick={onClose} disabled={isSubmitting} className="p-2 -mr-2 text-zinc-400 hover:text-zinc-900 hover:bg-white rounded-full transition-colors"><X size={20} strokeWidth={1.5} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col">
              <div className="p-6 space-y-4">
                <div className="bg-zinc-50 border border-zinc-100 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-200/60">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">เลขที่รายการ</span>
                    <span className="font-mono text-zinc-900 font-bold">{item.transactionNo}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">อุปกรณ์</span>
                      <span className="font-mono text-zinc-700 font-bold mt-1">{item.itemCode}</span>
                      <span className="text-sm text-zinc-900 font-medium">{item.itemName}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">จำนวน</span>
                      <div className="text-lg font-extrabold text-red-600 mt-1">{item.pendingAmount || item.quantity}</div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-zinc-200/60 flex items-center justify-between text-xs">
                    <span className="text-zinc-500">รหัสงาน: <span className="font-bold text-zinc-700">{item.jobNo || '-'}</span></span>
                    <span className="text-zinc-500 flex items-center gap-1"><User size={12}/> ผู้ทำรายการ: <span className="font-bold text-zinc-700">{item.recordedBy || item.createdBy || '-'}</span></span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-red-500 uppercase tracking-wider ml-1 flex gap-1">เหตุผลในการยกเลิก <span className="text-red-500">*</span></label>
                  <textarea 
                    required
                    autoFocus
                    placeholder="ระบุสาเหตุที่ต้องการยกเลิกคำขอนี้..." 
                    value={note} 
                    onChange={e => setNote(e.target.value)} 
                    className="w-full h-24 p-3 bg-white border border-zinc-200 rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none custom-scrollbar" 
                  />
                </div>
              </div>
              
              <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 flex gap-3">
                <button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 h-11 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-bold hover:bg-white transition-all disabled:opacity-50">ปิด</button>
                <button type="submit" disabled={!note.trim() || isSubmitting} className={cn("flex-[2] h-11 text-white rounded-xl text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 shadow-red-100", (!note.trim() || isSubmitting) && "opacity-50 cursor-not-allowed shadow-none")}>
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} strokeWidth={2.5}/>}
                  ยืนยันยกเลิกคำขอ
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

// --- 8. CANCEL HISTORY MODAL (ประวัติการยกเลิก) ---
const CancelHistoryModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('PR');
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      fetchHistory(activeTab);
      setSearchQuery('');
      requestAnimationFrame(() => requestAnimationFrame(() => setIsVisible(true)));
    } else {
      setIsVisible(false);
      setTimeout(() => setIsMounted(false), 200);
    }
  }, [isOpen, activeTab]);

  const fetchHistory = async (tab) => {
    setLoading(true);
    try {
      const endpoint = tab === 'PR' ? '/api/transactions/purchase/cancel' : '/api/transactions/withdraw/cancel';
      const res = await request(endpoint);
      setHistoryData(Array.isArray(res) ? res : (res?.data || []));
    } catch (error) {
      console.error("Failed to load cancel history", error);
      setHistoryData([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    return historyData.filter(item => {
      const q = searchQuery.toLowerCase();
      return item.transactionNo?.toLowerCase().includes(q) || 
             item.itemCode?.toLowerCase().includes(q) || 
             item.itemName?.toLowerCase().includes(q) || 
             item.jobNo?.toLowerCase().includes(q) || 
             item.createdBy?.toLowerCase().includes(q) ||
             item.canceledBy?.toLowerCase().includes(q);     
    });
  }, [historyData, searchQuery]);

  if (!isMounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
      <div className={cn("fixed inset-0 bg-zinc-900/50 backdrop-blur-sm transition-opacity duration-200 ease-out", isVisible ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <div className={cn("relative bg-white w-full max-w-6xl h-[85vh] rounded-2xl shadow-2xl border border-zinc-100 flex flex-col overflow-hidden", ANIMATION_CLASSES, isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4")}>
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 flex items-center justify-between border-b bg-red-50/50 border-red-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-100 text-red-700 hidden sm:block"><FileX size={24} /></div>
            <div>
              <h2 className="text-lg font-bold text-red-900">ประวัติการยกเลิกคำขอ (Cancelled Requests)</h2>
              <p className="text-xs sm:text-sm text-zinc-500">ตรวจสอบรายการคำขอซื้อและเบิกจ่ายที่ถูกยกเลิกไปแล้ว</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 text-zinc-400 hover:bg-white hover:text-zinc-900 rounded-full transition-colors"><X size={20} /></button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-zinc-100 bg-white shrink-0 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex p-1 bg-zinc-100 rounded-xl w-full sm:w-auto shrink-0">
            <button onClick={() => setActiveTab('PR')} className={cn("flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200", activeTab === 'PR' ? "bg-white text-emerald-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700")}>
              <ShoppingCart size={16} /> ประวัติยกเลิก (ขอซื้อ)
            </button>
            <button onClick={() => setActiveTab('WITHDRAW')} className={cn("flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200", activeTab === 'WITHDRAW' ? "bg-white text-amber-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700")}>
              <ArrowUpRight size={16} /> ประวัติยกเลิก (เบิกจ่าย)
            </button>
          </div>
          <div className="relative w-full sm:w-80 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input type="text" placeholder="ค้นหาเลขที่รายการ, รหัส, ชื่อ, ผู้ยกเลิก..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full h-10 pl-9 pr-4 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-900/10 focus:border-red-300 transition-all focus:bg-white" />
          </div>
        </div>

        {/* Table Area */}
        <div className="flex-1 overflow-x-auto custom-scrollbar bg-zinc-50/30">
          <table className="w-full text-left text-sm border-collapse min-w-[1000px]">
            <thead className="bg-white text-zinc-500 font-medium uppercase text-[11px] tracking-wider sticky top-0 z-10 shadow-sm border-b border-zinc-100">
              <tr>
                <th className="px-4 py-4 whitespace-nowrap">เลขที่รายการ</th>
                <th className="px-4 py-4 whitespace-nowrap">รายละเอียดอุปกรณ์</th>
                <th className="px-4 py-4 whitespace-nowrap">รหัสงาน</th>
                <th className="px-4 py-4 text-center whitespace-nowrap">จำนวน</th>
                <th className="px-4 py-4 whitespace-nowrap">ผู้สร้าง / ผู้ยกเลิก</th>
                <th className="px-4 py-4 whitespace-nowrap">วันที่สร้างรายการ</th>
                <th className="px-4 py-4 whitespace-nowrap">เหตุผลที่ยกเลิก</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                [...Array(6)].map((_, i) => <tr key={i} className="animate-pulse"><td colSpan="7" className="px-4 py-4"><div className="h-10 bg-zinc-100 rounded-lg w-full"></div></td></tr>)
              ) : filteredData.length > 0 ? (
                filteredData.map((item, index) => (
                  <tr key={index} className="hover:bg-red-50/30 transition-colors bg-white group">
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-mono font-bold text-zinc-700 bg-zinc-100 px-2 py-1 rounded border border-zinc-200 block truncate max-w-[140px] line-through decoration-red-400">{item.transactionNo}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-zinc-900 font-bold text-xs"><Hash size={12} className="inline text-zinc-400 mr-0.5"/>{item.itemCode}</span>
                        <span className="text-[11px] font-medium text-zinc-600 truncate max-w-[200px]">{item.itemName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-100 border border-zinc-200 text-[11px] font-bold text-zinc-700 truncate max-w-[100px]">
                        <Briefcase size={10} className="text-zinc-500 shrink-0"/>{item.jobNo || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-extrabold text-zinc-900">{item.quantity}</td>
                    
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 text-[11px]">
                        <div className="flex items-center gap-1.5"><User size={10} className="text-zinc-400"/> <span className="font-medium text-zinc-600 truncate max-w-[100px]">{item.createdBy || '-'}</span></div>
                        <div className="flex items-center gap-1.5"><Ban size={10} className="text-red-500"/> <span className="font-bold text-red-600 truncate max-w-[100px]">{item.canceledBy || '-'}</span></div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-mono text-zinc-500 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100 whitespace-nowrap">{item.createdAt}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[10px] text-red-600 font-medium bg-red-50 border border-red-100 p-1.5 rounded truncate max-w-[200px]" title={item.note}>{item.note || '-'}</div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="h-[40vh] bg-transparent p-0">
                    <div className="flex flex-col items-center justify-center h-full text-zinc-400 w-full absolute left-0">
                      <FileX size={40} className="opacity-20 mb-3" />
                      <p className="text-sm font-medium text-zinc-500">ไม่พบประวัติการยกเลิก</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>,
    document.body
  );
};


// --- MAIN TRANSACTIONS PAGE ---
export default function Transactions() {
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState('PR'); // 'PR' | 'WITHDRAW'
  const [requestData, setRequestData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [receivingPendingItem, setReceivingPendingItem] = useState(null); 
  const [approveItem, setApproveItem] = useState(null); 
  const [cancelItem, setCancelItem] = useState(null); // ✅ สำหรับเปิด Modal ยกเลิกคำขอ
  const [transactionType, setTransactionType] = useState(null); 
  const [isWriteOffModalOpen, setIsWriteOffModalOpen] = useState(false); 
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false); 
  const [isCancelLogModalOpen, setIsCancelLogModalOpen] = useState(false); // ✅ สำหรับเปิด Modal ประวัติยกเลิก

  const loadData = async (tab) => {
    setLoading(true);
    try {
      const endpoint = tab === 'PR' ? '/api/transactions/purchase/request' : '/api/transactions/withdraw/request';
      const res = await request(endpoint);
      const data = Array.isArray(res) ? res : (res?.data || []);
      setRequestData(data);
    } catch (error) {
      showToast(`ดึงข้อมูลรายการ${tab === 'PR' ? 'ขอซื้อ' : 'ขอเบิก'}ไม่สำเร็จ`, "error");
      setRequestData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(activeTab);
    searchQuery && setSearchQuery(''); 
  }, [activeTab]);

  const filteredItems = useMemo(() => {
    if (!Array.isArray(requestData)) return [];
    return requestData.filter(item => {
      const searchTxt = searchQuery.toLowerCase();
      return item.transactionNo?.toLowerCase().includes(searchTxt) ||
             item.itemCode?.toLowerCase().includes(searchTxt) || 
             item.itemName?.toLowerCase().includes(searchTxt) ||
             item.jobNo?.toLowerCase().includes(searchTxt) ||
             item.recordedBy?.toLowerCase().includes(searchTxt); 
    });
  }, [requestData, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4 md:px-8 space-y-8 relative animate-in fade-in duration-500">
      
      {/* ใช้งาน Modals */}
      <PendingReceiveModal isOpen={!!receivingPendingItem} onClose={() => setReceivingPendingItem(null)} pendingItem={receivingPendingItem} onSuccess={(msg, type) => { showToast(msg, type); if (type === 'success') loadData(activeTab); }} />
      <TransactionModal isOpen={!!transactionType} type={transactionType} onClose={() => setTransactionType(null)} onSuccess={(msg, type) => { showToast(msg, type); if (type === 'success') loadData(activeTab); }} />
      <ApproveWithdrawModal isOpen={!!approveItem} approveItem={approveItem} onClose={() => setApproveItem(null)} onSuccess={(msg, type) => { showToast(msg, type); if (type === 'success') loadData(activeTab); }} />
      
      <CancelRequestModal isOpen={!!cancelItem} onClose={() => setCancelItem(null)} item={cancelItem} activeTab={activeTab} onSuccess={(msg, type) => { showToast(msg, type); if (type === 'success') loadData(activeTab); }} />
      <WriteOffSummaryModal isOpen={isWriteOffModalOpen} onClose={() => setIsWriteOffModalOpen(false)} />
      <TransactionHistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} /> 
      <CancelHistoryModal isOpen={isCancelLogModalOpen} onClose={() => setIsCancelLogModalOpen(false)} /> 

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 flex items-center gap-2">
            จัดการคำขอ (Requests)
          </h1>
          <p className="text-zinc-500 text-sm font-light mt-1">จัดการรายการขอซื้อเข้าคลัง และอนุมัติการเบิกจ่ายอุปกรณ์</p>
        </div>
        <div className="flex flex-row items-center gap-3 w-full md:w-auto">
          <button onClick={() => setTransactionType('PR')} className="h-10 px-4 bg-white border border-zinc-200 text-emerald-700 rounded-xl text-sm font-medium hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95">
            <ShoppingCart size={16} /> <span className="hidden sm:inline">สร้างใบขอซื้อ (PR)</span>
          </button>
          <button onClick={() => setTransactionType('WITHDRAW')} className="h-10 px-4 bg-zinc-900 border border-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95">
            <ArrowUpRight size={16} /> <span className="hidden sm:inline">สร้างใบเบิกอุปกรณ์</span>
          </button>
        </div>
      </div>

      {/* REQUESTS TABLE SECTION */}
      <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4">
        
        {/* TOGGLE TABS & SEARCH */}
        <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex flex-col xl:flex-row justify-between items-center gap-4">
          <div className="flex p-1 bg-zinc-200/60 rounded-xl w-full xl:w-auto shrink-0">
            <button onClick={() => setActiveTab('PR')} className={cn("flex-1 xl:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200", activeTab === 'PR' ? "bg-white text-emerald-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50")}>
              <ShoppingCart size={16} /> รายการขอซื้อ (PR)
            </button>
            <button onClick={() => setActiveTab('WITHDRAW')} className={cn("flex-1 xl:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200", activeTab === 'WITHDRAW' ? "bg-white text-amber-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50")}>
              <ArrowUpRight size={16} /> รายการขอเบิก (Withdraw)
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 w-full xl:w-auto">
            <button onClick={() => setIsHistoryModalOpen(true)} className="h-10 px-3 bg-white text-zinc-600 border border-zinc-200 rounded-lg text-sm font-bold hover:bg-zinc-50 transition-all flex items-center justify-center shadow-sm gap-2" title="ประวัติการทำรายการ">
              <History size={16} /> <span className="hidden sm:inline">ประวัติ</span>
            </button>
            <button onClick={() => setIsCancelLogModalOpen(true)} className="h-10 px-3 bg-white text-red-600 border border-zinc-200 rounded-lg text-sm font-bold hover:bg-red-50 transition-all flex items-center justify-center shadow-sm gap-2" title="ประวัติยกเลิก">
              <FileX size={16} /> <span className="hidden sm:inline">ประวัติยกเลิก</span>
            </button>
            <button onClick={() => setIsWriteOffModalOpen(true)} className="h-10 px-3 bg-white text-orange-600 border border-zinc-200 rounded-lg text-sm font-bold hover:bg-orange-50 transition-all flex items-center justify-center shadow-sm gap-2" title="ประวัติตัดจำหน่าย">
              <FileMinus size={16} /> <span className="hidden sm:inline">ตัดจำหน่าย</span>
            </button>
            
            <div className="relative w-full sm:w-72 group mt-2 sm:mt-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-800 transition-colors" size={16} />
              <input type="text" placeholder="ค้นหาเลขที่, รหัส, รหัสงาน หรือผู้บันทึก..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-10 pl-9 pr-4 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-300 transition-all shadow-sm" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          {/* ✅ เอา table-fixed ออก และให้ข้อมูลวันที่ใช้ whitespace-nowrap ห้ามตัดบรรทัด */}
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-zinc-100 bg-white">
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400 whitespace-nowrap">เลขที่รายการ</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400 min-w-[200px]">รายละเอียดอุปกรณ์</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400 whitespace-nowrap">รหัสงาน</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-center whitespace-nowrap">จำนวน</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400 whitespace-nowrap">ผู้ทำรายการ</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400 whitespace-nowrap">วันที่รายการ</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-right whitespace-nowrap">จัดการ</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-zinc-50">
              {loading ? (
                [...Array(4)].map((_, i) => <tr key={i} className="animate-pulse"><td colSpan="7" className="px-6 py-4"><div className="h-8 bg-zinc-100 rounded-lg w-full"></div></td></tr>)
              ) : filteredItems.length > 0 ? (
                filteredItems.map((item, index) => (
                  <tr key={index} className="group hover:bg-zinc-50/50 transition-colors">
                    
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-mono font-bold text-zinc-700 bg-zinc-100 px-2 py-1 rounded border border-zinc-200 truncate block">
                        {item.transactionNo}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 font-mono text-zinc-900 font-bold text-xs">
                          <Hash size={12} className="text-zinc-400" /> {item.itemCode}
                        </div>
                        <span className="text-[11px] font-medium text-zinc-600 truncate max-w-[250px]">{item.itemName || 'ไม่ทราบชื่ออุปกรณ์'}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-100 border border-zinc-200 text-[11px] font-bold text-zinc-700 truncate max-w-[100px]">
                        <Briefcase size={10} className="text-zinc-500 shrink-0"/>
                        <span className="truncate">{item.jobNo || '-'}</span>
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-md font-extrabold text-xs border shadow-sm",
                        activeTab === 'PR' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"
                      )}>
                        {item.pendingAmount || item.quantity}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                       <div className="flex items-center gap-1.5">
                         <div className="w-5 h-5 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-500 shrink-0"><User size={10} /></div>
                         <span className="text-[11px] font-medium text-zinc-700 truncate max-w-[120px]">{item.recordedBy || item.createdBy || '-'}</span>
                       </div>
                    </td>

                    {/* ✅ แก้ไขจุดนี้: ดึงค่าทั้ง createdAt หรือ lastUpdated มาแสดงและป้องกันการตัดคำบรรทัด */}
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-mono text-zinc-500 bg-white border border-zinc-200 px-2 py-1 rounded inline-block whitespace-nowrap">
                         {item.createdAt || item.lastUpdated || '-'}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {activeTab === 'PR' ? (
                          <button onClick={() => setReceivingPendingItem(item)} className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg text-[11px] font-bold transition-all shadow-sm border border-emerald-200 hover:border-emerald-600 active:scale-95 whitespace-nowrap">
                            <ArrowDownToLine size={14} strokeWidth={2.5}/> รับของ
                          </button>
                        ) : (
                          <button onClick={() => setApproveItem(item)} className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white rounded-lg text-[11px] font-bold transition-all shadow-sm border border-amber-200 hover:border-amber-600 active:scale-95 whitespace-nowrap">
                            <CheckCircle2 size={14} strokeWidth={2.5}/> อนุมัติ
                          </button>
                        )}
                        <button onClick={() => setCancelItem(item)} className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-lg text-[11px] font-bold transition-all shadow-sm border border-red-200 hover:border-red-500 active:scale-95 whitespace-nowrap">
                          <Ban size={14} strokeWidth={2.5} /> ยกเลิก
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-zinc-400">
                      {activeTab === 'PR' 
                        ? <ShoppingCart size={32} strokeWidth={1.5} className="mb-2 opacity-30 text-emerald-600"/>
                        : <ArrowUpRight size={32} strokeWidth={1.5} className="mb-2 opacity-30 text-amber-600"/>
                      }
                      <p className="text-sm text-zinc-500 font-bold">ไม่มีรายการคำขอในขณะนี้</p>
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