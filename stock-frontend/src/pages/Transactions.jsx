import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowDownToLine, ArrowUpFromLine, Search, Package, 
  Hash, Clock, X, Loader2, CheckCircle2, FileText,
  ArrowDownLeft, ArrowUpRight, Calendar, Trash2, Filter, ChevronDown, Check, RefreshCcw, Briefcase, Plus
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { request } from '../utils/fetchUtils';
import { useToast } from '../context/ToastContext';

function cn(...inputs) { return twMerge(clsx(inputs)); }

const ANIMATION_CLASSES = "transform transition-all duration-200 ease-out will-change-[transform,opacity]";

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

  const categories = [...new Set(safeData.map(item => item.category).filter(Boolean))];

  if (!isMounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className={cn("fixed inset-0 bg-zinc-900/50 backdrop-blur-sm transition-opacity duration-200 ease-out", isVisible ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <div className={cn("relative bg-white w-full max-w-3xl h-[80vh] rounded-2xl shadow-2xl border border-zinc-100 flex flex-col", ANIMATION_CLASSES, isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4")}>
        <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/80 rounded-t-2xl">
          <div><h3 className="text-lg font-semibold text-zinc-900">เลือกอุปกรณ์</h3><p className="text-sm text-zinc-500">ค้นหาและเลือกอุปกรณ์จากคลัง</p></div>
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
                filteredData.map((item) => (
                  <tr key={item.itemCode} className="hover:bg-zinc-50 group transition-colors bg-white">
                    <td className="px-6 py-3 font-mono text-zinc-500 font-medium">{item.itemCode}</td><td className="px-6 py-3 text-zinc-900">{item.name}</td><td className="px-6 py-3 text-zinc-500">{item.category}</td><td className="px-6 py-3 text-right font-bold text-zinc-700">{item.balance} <span className="text-[10px] font-normal text-zinc-400">{item.unit}</span></td>
                    <td className="px-6 py-3 text-center"><button onClick={() => { onSelect(item); onClose(); }} className="px-4 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded-lg hover:bg-zinc-700 transition-all shadow-sm active:scale-95">เลือก</button></td>
                  </tr>
                ))
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

// --- 2. GENERAL TRANSACTION MODAL (WITHDRAW / RECEIVE อิสระ) ---
const TransactionModal = ({ isOpen, type, onClose, onSuccess }) => {
  const [activeType, setActiveType] = useState(type);
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

  const isReceive = activeType === 'IN';
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
      const endpoint = activeType === 'IN' ? '/api/transactions/receive' : '/api/transactions/withdraw';
      const payload = items.map(item => ({ 
        itemCode: item.itemCode, 
        jobNo: item.jobNo.trim(), 
        quantity: Number(item.quantity), 
        note: item.note || "" 
      }));
      
      await request(endpoint, { method: 'POST', body: JSON.stringify(payload) });
      onSuccess(`บันทึกการ${isReceive ? 'รับเข้า' : 'เบิกจ่าย'}สำเร็จ`, "success");
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
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className={cn("fixed inset-0 bg-zinc-900/50 backdrop-blur-sm transition-opacity duration-200 ease-out", isVisible ? "opacity-100" : "opacity-0")} onClick={onClose} />
        <div className={cn("relative bg-white w-full max-w-3xl p-0 rounded-2xl shadow-2xl border border-zinc-100 flex flex-col overflow-hidden", ANIMATION_CLASSES, isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4")}>
          <div className={cn("px-6 py-4 flex items-center justify-between border-b transition-colors duration-200", isReceive ? "bg-emerald-50/50 border-emerald-100" : "bg-amber-50/50 border-amber-100")}>
            <div className="flex items-center gap-3">
              <div className={cn("p-2.5 rounded-xl transition-colors duration-200", isReceive ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>{isReceive ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}</div>
              <div><h2 className={cn("text-lg font-semibold transition-colors duration-200", isReceive ? "text-emerald-900" : "text-amber-900")}>{isReceive ? "รับอุปกรณ์เข้าคลัง" : "เบิกจ่ายอุปกรณ์"}</h2><p className="text-sm text-zinc-500">{isReceive ? "เพิ่มจำนวนอุปกรณ์เข้าสต็อก" : "ตัดจำนวนอุปกรณ์ออกจากสต็อก"}</p></div>
            </div>
            <button onClick={onClose} className="p-2 -mr-2 text-zinc-400 hover:text-zinc-900 hover:bg-white rounded-full transition-colors"><X size={20} /></button>
          </div>
          <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-2"><Calendar size={14} /><span>วันที่: <span className="text-zinc-900 font-medium">{new Date().toLocaleDateString('th-TH')}</span></span></div>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex flex-col gap-3 p-4 bg-zinc-50 rounded-xl border border-zinc-100 group transition-all hover:border-zinc-300">
                  
                  <div className="flex items-start gap-3 w-full">
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">รหัสอุปกรณ์</label>
                      <div className="relative flex gap-2">
                        <div onClick={() => handleOpenPicker(index)} className={cn("flex-1 h-10 px-3 border rounded-lg text-sm flex items-center cursor-pointer transition-all bg-white hover:border-zinc-400 hover:shadow-sm truncate", !item.itemCode ? "text-zinc-400 border-zinc-200 border-dashed" : "text-zinc-900 border-zinc-300 font-medium")}>
                            {item.itemCode ? `${item.itemCode} - ${item.itemName}` : "คลิกเพื่อค้นหาอุปกรณ์..."}
                        </div>
                        <button onClick={() => handleOpenPicker(index)} className="h-10 w-10 shrink-0 flex items-center justify-center bg-zinc-200 hover:bg-zinc-300 text-zinc-600 rounded-lg transition-colors"><Search size={16} /></button>
                      </div>
                      {item.itemCode && (<p className="text-[10px] text-zinc-400 mt-1 pl-1">คงเหลือปัจจุบัน: <span className="font-medium text-zinc-700">{item.currentStock} {item.unit}</span></p>)}
                    </div>
                    <div className="w-10 pt-5">
                      <button onClick={() => handleRemoveItem(index)} disabled={items.length === 1} className="h-10 w-10 flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400"><Trash2 size={18} /></button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <div className="w-full sm:w-1/3 space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex justify-between">รหัสงาน <span className="text-red-400">*</span></label>
                      <input type="text" required placeholder="เช่น JOB-001" value={item.jobNo} onChange={(e) => handleFieldChange(index, 'jobNo', e.target.value)} className="w-full h-10 px-3 bg-white border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all" />
                    </div>
                    <div className="w-full sm:w-1/4 space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex justify-between">จำนวน <span className="text-red-400">*</span></label>
                      <input type="number" min="1" required value={item.quantity} onChange={(e) => handleFieldChange(index, 'quantity', e.target.value)} className="w-full h-10 px-3 bg-white border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 text-center transition-all" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">หมายเหตุ</label>
                      <input type="text" placeholder="ระบุเหตุผลเพิ่มเติม..." value={item.note} onChange={(e) => handleFieldChange(index, 'note', e.target.value)} className="w-full h-10 px-3 bg-white border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 placeholder:text-zinc-300 transition-all" />
                    </div>
                  </div>

                </div>
              ))}
            </div>
            <button onClick={handleAddItem} className="w-full py-3 border border-dashed border-zinc-300 rounded-xl text-zinc-500 hover:text-zinc-900 hover:border-zinc-400 hover:bg-zinc-50 transition-all flex items-center justify-center gap-2 text-sm font-medium"><Plus size={16} /> เพิ่มรายการอุปกรณ์</button>
          </div>
          <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 flex gap-3">
            <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-medium hover:bg-white transition-all">ยกเลิก</button>
            <button onClick={handleSubmit} disabled={!isValid || isSubmitting} className={cn("flex-1 h-11 text-white rounded-xl text-sm font-medium transition-all shadow-md flex items-center justify-center gap-2", isReceive ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100" : "bg-amber-600 hover:bg-amber-700 shadow-amber-100", (!isValid || isSubmitting) && "opacity-50 cursor-not-allowed shadow-none")}>{isSubmitting && <RefreshCcw size={16} className="animate-spin" />} ยืนยันการ{isReceive ? 'รับเข้า' : 'เบิกจ่าย'}</button>
          </div>
        </div>
      </div>
      <ItemSelectorModal isOpen={isPickerOpen} onClose={() => setIsPickerOpen(false)} onSelect={handleSelectItem} data={inventoryData} />
    </>,
    document.body
  );
};

// --- 3. PENDING RECEIVE MODAL (รับของจากค้างจ่าย) ---
const PendingReceiveModal = ({ isOpen, onClose, onSuccess, pendingItem }) => {
  const [receiveList, setReceiveList] = useState([]); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen && pendingItem) {
      setIsMounted(true);
      
      setReceiveList([{
        itemCode: pendingItem.itemCode,
        itemName: pendingItem.itemName,
        jobNo: pendingItem.jobNo || '-', // ✅ ดึง JobNo มาจาก Backend
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
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const payload = receiveList.map(item => ({
        itemCode: item.itemCode,
        jobNo: item.jobNo,
        quantity: Number(item.receiveQty),
        note: item.note
      }));

      await request('/api/transactions/receive', { method: 'POST', body: JSON.stringify(payload) });
      onSuccess("รับเข้าอุปกรณ์สำเร็จ", "success");
      onClose();
    } catch (error) {
      onSuccess(error.message || "รับอุปกรณ์ไม่สำเร็จ", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormInvalid = receiveList.some(i => !i.receiveQty || Number(i.receiveQty) <= 0 || !i.jobNo);

  if (!isMounted || !pendingItem) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className={cn("fixed inset-0 bg-zinc-900/50 backdrop-blur-sm transition-opacity duration-200 ease-out", isVisible ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <div className={cn("relative bg-white w-full max-w-2xl p-6 rounded-2xl shadow-2xl border border-zinc-100 flex flex-col max-h-[90vh]", ANIMATION_CLASSES, isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-8")}>
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 tracking-tight flex items-center gap-2">
              <ArrowDownToLine size={20} className="text-emerald-600" />
              รับเข้าอุปกรณ์ที่ค้างจ่าย
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              ยืนยันการรับเข้าอุปกรณ์ที่ถูกเบิกไปก่อนหน้า
            </p>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-full transition-colors">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="space-y-3 overflow-y-auto pr-2 pb-4">
            {receiveList.map((item, index) => (
              <div key={index} className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex flex-col gap-3 relative">
                <div className="flex justify-between items-center border-b border-zinc-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-zinc-900">{item.itemCode}</span>
                    <span className="text-xs text-zinc-500 bg-white px-2 py-0.5 rounded border border-zinc-100">{item.itemName || 'ไม่ทราบชื่ออุปกรณ์'}</span>
                  </div>
                  <div className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-md border border-orange-100">
                    ค้างจ่าย: {item.withdrawnQty}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="w-full sm:w-1/3">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex justify-between mb-1">รหัสงาน</label>
                    {/* ✅ ล็อคช่อง Job No ไม่ให้แก้ (Read-only) + ดีไซน์สีเทา */}
                    <input 
                      type="text" 
                      readOnly 
                      value={item.jobNo} 
                      className="w-full h-10 px-3 bg-zinc-100 border border-zinc-200 rounded-lg text-sm text-zinc-500 cursor-not-allowed outline-none" 
                    />
                  </div>
                  <div className="w-full sm:w-1/4">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex justify-between mb-1">จำนวนที่รับ <span className="text-red-400">*</span></label>
                    {/* ✅ ปลดล็อคเพดาน! ใส่ตัวเลขได้อิสระ ไม่ดีดกลับ */}
                    <input 
                      type="number" 
                      required 
                      min="1" 
                      value={item.receiveQty} 
                      onChange={e => updateField(index, 'receiveQty', e.target.value)} 
                      className="w-full h-10 px-3 bg-white border border-zinc-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" 
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">หมายเหตุ <span className="text-zinc-300 normal-case">(ไม่บังคับ)</span></label>
                    <input type="text" placeholder="ระบุรายละเอียดสภาพอุปกรณ์..." value={item.note} onChange={e => updateField(index, 'note', e.target.value)} className="w-full h-10 px-3 bg-white border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
                  </div>
                </div>

              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-zinc-100 flex gap-3 shrink-0 mt-2">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-medium hover:bg-zinc-50 transition-all">ยกเลิก</button>
            <button type="submit" disabled={isSubmitting || isFormInvalid} className="flex-1 h-11 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-100">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              ยืนยันการรับเข้า
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

// --- 4. MAIN TRANSACTIONS PAGE ---
export default function Transactions() {
  const { showToast } = useToast();
  
  const [pendingItems, setPendingItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [receivingPendingItem, setReceivingPendingItem] = useState(null); 
  const [transactionType, setTransactionType] = useState(null); 

  const loadData = async () => {
    setLoading(true);
    try {
      const pendingRes = await request('/api/transactions/pending');
      const pData = Array.isArray(pendingRes) ? pendingRes : (pendingRes?.data || []);
      setPendingItems(pData);
    } catch (error) {
      showToast("ดึงข้อมูลรายการค้างจ่ายไม่สำเร็จ", "error");
      setPendingItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredItems = useMemo(() => {
    if (!Array.isArray(pendingItems)) return [];
    return pendingItems.filter(item => {
      const searchTxt = searchQuery.toLowerCase();
      return item.itemCode?.toLowerCase().includes(searchTxt) || 
             item.itemName?.toLowerCase().includes(searchTxt) ||
             item.jobNo?.toLowerCase().includes(searchTxt); // รองรับค้นหาด้วย JobNo
    });
  }, [pendingItems, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4 md:px-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <PendingReceiveModal 
        isOpen={!!receivingPendingItem}
        onClose={() => setReceivingPendingItem(null)}
        pendingItem={receivingPendingItem}
        onSuccess={(msg, type) => {
          showToast(msg, type);
          if (type === 'success') loadData();
        }}
      />

      <TransactionModal 
        isOpen={!!transactionType} 
        type={transactionType} 
        onClose={() => setTransactionType(null)} 
        onSuccess={(msg, type) => {
          showToast(msg, type);
          if (type === 'success') loadData();
        }}
      />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 flex items-center gap-2">
            <FileText className="text-zinc-900" size={24}/> ประวัติการทำรายการ
          </h1>
          <p className="text-zinc-500 text-sm font-light mt-1">จัดการรายการค้างจ่ายและการเบิกจ่ายอุปกรณ์</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTransactionType('OUT')} className="h-10 px-4 bg-amber-50 text-amber-700 border border-amber-100 rounded-xl text-sm font-medium hover:bg-amber-100 transition-all flex items-center gap-2 shadow-sm active:scale-95">
            <ArrowUpRight size={16} /> <span className="hidden sm:inline">เบิกจ่าย</span>
          </button>
          {/* <button onClick={() => setTransactionType('IN')} className="h-10 px-4 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-sm font-medium hover:bg-emerald-100 transition-all flex items-center gap-2 shadow-sm active:scale-95">
            <ArrowDownLeft size={16} /> <span className="hidden sm:inline">รับเข้า</span>
          </button> */}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-zinc-100 bg-zinc-50/30 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="text-sm font-bold text-zinc-800 flex items-center gap-2">
            <Clock size={16} className="text-orange-500"/> รายการเบิกจ่ายที่รอดำเนินการคืน (ค้างจ่าย)
          </h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input type="text" placeholder="ค้นหาด้วยรหัส, ชื่อ หรือรหัสงาน..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-9 pl-9 pr-3 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 transition-all" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-white">
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-500">รายละเอียดอุปกรณ์</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-500">รหัสงาน</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-500 text-center">จำนวนที่ค้าง</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-500">อัปเดตล่าสุด</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-500 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-zinc-50">
              {loading ? (
                [...Array(3)].map((_, i) => <tr key={i} className="animate-pulse"><td colSpan="5" className="px-6 py-4"><div className="h-10 bg-zinc-100 rounded-lg w-full"></div></td></tr>)
              ) : filteredItems.length > 0 ? (
                filteredItems.map((item, index) => (
                  <tr key={index} className="group hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 font-mono text-zinc-900 font-medium">
                          <Hash size={12} className="text-zinc-400" /> {item.itemCode}
                        </div>
                        <span className="text-xs text-zinc-500 mt-0.5">{item.itemName || 'ไม่ทราบชื่ออุปกรณ์'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {/* ✅ เพิ่มคอลัมน์ Job No ให้ดูง่ายๆ ในตาราง */}
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-xs font-bold text-zinc-700">
                        <Briefcase size={12} className="text-zinc-500"/>
                        {item.jobNo || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md bg-orange-50 text-orange-700 font-bold text-xs border border-orange-100">
                        {item.pendingAmount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-500">
                      {item.lastUpdated}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setReceivingPendingItem(item)} className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-bold transition-all shadow-sm border border-emerald-200 hover:border-emerald-600">
                        <ArrowDownToLine size={14} strokeWidth={2.5}/> รับเข้า
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-zinc-400">
                      <Package size={32} strokeWidth={1} className="mb-2 opacity-50"/>
                      <p className="text-sm text-zinc-500 font-medium">ไม่มีรายการค้างจ่าย</p>
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