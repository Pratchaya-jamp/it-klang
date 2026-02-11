import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { 
  Search, SlidersHorizontal, ChevronDown, Check, X, Trash2,
  Package, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, 
  Download, RefreshCcw, AlertCircle, CheckCircle2, FileSpreadsheet,
  ArrowDownLeft, ArrowUpRight, Plus, Calendar, Filter, StickyNote
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useToast } from '../context/ToastContext';

// Utility
function cn(...inputs) { return twMerge(clsx(inputs)); }

// --- API SERVICES ---
const fetchStocks = async (queryString) => {
  try {
    const response = await fetch(`/api/stocks/overview?${queryString}`);
    if (!response.ok) throw new Error(`API Error`);
    return await response.json();
  } catch (error) { return []; }
};

const submitTransaction = async (type, items) => {
  const endpoint = type === 'IN' ? '/api/transactions/receive' : '/api/transactions/withdraw';
  
  // Transform data to match API Spec: Array of Objects
  const payload = items.map(item => ({
    itemCode: item.itemCode,
    quantity: Number(item.quantity),
    note: item.note || "", 
    createdBy: "Admin" 
  }));

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error('Transaction failed');
  return await response.json();
};

// --- SUB-COMPONENTS ---

// 1. Item Selector Modal (Popup Level 2: Z-Index 200)
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
      const timer = setTimeout(() => setIsMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const filteredData = data.filter(item => {
    const matchesSearch = 
      item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter ? item.category === categoryFilter : true;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(data.map(item => item.category))];

  if (!isMounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className={cn("fixed inset-0 bg-zinc-900/60 backdrop-blur-sm transition-opacity duration-300", isVisible ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <div className={cn("relative bg-white w-full max-w-3xl h-[80vh] rounded-2xl shadow-2xl border border-zinc-100 flex flex-col transform transition-all duration-300", isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4")}>
        <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/80 rounded-t-2xl">
          <div><h3 className="text-lg font-semibold text-zinc-900">Select Item</h3><p className="text-sm text-zinc-500">Search and select an item from inventory.</p></div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:bg-zinc-200 rounded-full transition-colors"><X size={20}/></button>
        </div>
        <div className="p-4 border-b border-zinc-100 flex gap-3 bg-white shadow-sm z-10">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input type="text" placeholder="Search by Code or Name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full h-11 pl-10 pr-4 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300 transition-all" autoFocus />
          </div>
          <div className="relative w-48">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full h-11 pl-10 pr-8 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 cursor-pointer appearance-none">
              <option value="">All Categories</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={14} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-zinc-50 text-zinc-500 font-medium uppercase text-xs sticky top-0 z-10 shadow-sm">
              <tr><th className="px-6 py-3">Code</th><th className="px-6 py-3">Name</th><th className="px-6 py-3">Category</th><th className="px-6 py-3 text-right">Stock Bal.</th><th className="px-6 py-3 text-center">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <tr key={item.itemCode} className="hover:bg-zinc-50 group transition-colors">
                    <td className="px-6 py-3 font-mono text-zinc-500 font-medium">{item.itemCode}</td><td className="px-6 py-3 text-zinc-900">{item.name}</td><td className="px-6 py-3 text-zinc-500">{item.category}</td><td className="px-6 py-3 text-right font-bold text-zinc-700">{item.balance} <span className="text-[10px] font-normal text-zinc-400">{item.unit}</span></td>
                    <td className="px-6 py-3 text-center"><button onClick={() => { onSelect(item); onClose(); }} className="px-4 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded-lg hover:bg-zinc-700 transition-all shadow-sm active:scale-95">Select</button></td>
                  </tr>
                ))
              ) : (<tr><td colSpan="5" className="px-6 py-20 text-center text-zinc-400 flex flex-col items-center"><Package size={32} className="opacity-20 mb-2" />No items found.</td></tr>)}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 bg-zinc-50 border-t border-zinc-100 text-xs text-zinc-400 flex justify-between"><span>Showing {filteredData.length} items</span><span>Press ESC to close</span></div>
      </div>
    </div>,
    document.body
  );
};

// 2. Transaction Modal (Popup Level 1: Z-Index 100)
const TransactionModal = ({ isOpen, type, onClose, onSuccess, inventoryData }) => {
  const [activeType, setActiveType] = useState(type);
  const [items, setItems] = useState([{ itemCode: '', itemName: '', quantity: 1, currentStock: 0, unit: '', note: '' }]);
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
      setItems([{ itemCode: '', itemName: '', quantity: 1, currentStock: 0, unit: '', note: '' }]);
      requestAnimationFrame(() => requestAnimationFrame(() => setIsVisible(true)));
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setIsMounted(false), 300);
      return () => clearTimeout(timer);
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
        unit: item.unit, 
        quantity: 1 
      };
      setItems(newItems);
    }
  };

  const handleFieldChange = (index, field, val) => {
    const newItems = [...items];
    newItems[index][field] = val;
    setItems(newItems);
  };

  const handleAddItem = () => setItems([...items, { itemCode: '', itemName: '', quantity: 1, currentStock: 0, unit: '', note: '' }]);
  const handleRemoveItem = (index) => setItems(items.filter((_, i) => i !== index));
  
  const isValid = items.every(item => item.itemCode && item.quantity > 0);
  
  const handleSubmit = async () => {
    if (!isValid) return;
    setIsSubmitting(true);
    try {
      await submitTransaction(activeType, items);
      onSuccess(`Successfully ${isReceive ? 'received' : 'withdrawn'} items.`, "success");
      onClose();
    } catch (error) {
      onSuccess(`Failed to process transaction.`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className={cn("fixed inset-0 bg-zinc-900/40 backdrop-blur-sm transition-opacity duration-300", isVisible ? "opacity-100" : "opacity-0")} onClick={onClose} />
        
        <div className={cn("relative bg-white w-full max-w-3xl p-0 rounded-2xl shadow-2xl border border-zinc-100 flex flex-col transform transition-all duration-300 overflow-hidden", isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4")}>
          
          <div className={cn("px-6 py-4 flex items-center justify-between border-b transition-colors duration-300", isReceive ? "bg-emerald-50/50 border-emerald-100" : "bg-amber-50/50 border-amber-100")}>
            <div className="flex items-center gap-3">
              <div className={cn("p-2.5 rounded-xl transition-colors duration-300", isReceive ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>{isReceive ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}</div>
              <div><h2 className={cn("text-lg font-semibold transition-colors duration-300", isReceive ? "text-emerald-900" : "text-amber-900")}>{isReceive ? "Receive Stock" : "Withdraw Stock"}</h2><p className="text-sm text-zinc-500">{isReceive ? "Add items to inventory" : "Disburse items from inventory"}</p></div>
            </div>
            <button onClick={onClose} className="p-2 -mr-2 text-zinc-400 hover:text-zinc-900 hover:bg-white rounded-full transition-colors"><X size={20} /></button>
          </div>

          <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-2"><Calendar size={14} /><span>Date: <span className="text-zinc-900 font-medium">{new Date().toLocaleDateString()}</span></span></div>
            
            <div className="space-y-3">
              {items.map((item, index) => (
                // ใช้ items-start เพื่อแก้ปัญหากล่องเบี้ยวเวลา Stock info โผล่มา
                <div key={index} className="flex flex-col sm:flex-row items-start gap-3 p-4 bg-zinc-50 rounded-xl border border-zinc-100 group transition-all hover:border-zinc-300">
                  
                  {/* Row: Item Selector */}
                  <div className="flex-1 w-full sm:w-auto space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Item</label>
                    <div className="relative flex gap-2">
                      <div onClick={() => handleOpenPicker(index)} className={cn("flex-1 h-10 px-3 border rounded-lg text-sm flex items-center cursor-pointer transition-all bg-white hover:border-zinc-400 hover:shadow-sm truncate", !item.itemCode ? "text-zinc-400 border-zinc-200 border-dashed" : "text-zinc-900 border-zinc-300 font-medium")}>
                         {item.itemCode ? `${item.itemCode} - ${item.itemName}` : "Click to search item..."}
                      </div>
                      <button onClick={() => handleOpenPicker(index)} className="h-10 w-10 shrink-0 flex items-center justify-center bg-zinc-200 hover:bg-zinc-300 text-zinc-600 rounded-lg transition-colors"><Search size={16} /></button>
                    </div>
                    {item.itemCode && (<p className="text-[10px] text-zinc-400 mt-1 pl-1">Current Stock: <span className="font-medium text-zinc-700">{item.currentStock} {item.unit}</span></p>)}
                  </div>
                  
                  {/* Row: Quantity */}
                  <div className="w-full sm:w-24 space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Qty</label>
                    <input type="number" min="1" value={item.quantity} onChange={(e) => handleFieldChange(index, 'quantity', Number(e.target.value))} className="w-full h-10 px-3 bg-white border border-zinc-200 rounded-lg text-sm outline-none focus:border-zinc-400 text-center" />
                  </div>

                  {/* Row: Note */}
                  <div className="flex-1 w-full sm:w-auto space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Note</label>
                    <input 
                      type="text" 
                      placeholder="Optional remark..."
                      value={item.note} 
                      onChange={(e) => handleFieldChange(index, 'note', e.target.value)} 
                      className="w-full h-10 px-3 bg-white border border-zinc-200 rounded-lg text-sm outline-none focus:border-zinc-400 placeholder:text-zinc-300" 
                    />
                  </div>

                  {/* Delete Button (Aligned with invisible label) */}
                  <div className="w-auto space-y-1">
                     {/* Label ล่องหน เพื่อดันปุ่มลงมาในระดับเดียวกับ Input */}
                     <label className="text-[10px] font-bold uppercase tracking-wider invisible block">Del</label> 
                     <button onClick={() => handleRemoveItem(index)} disabled={items.length === 1} className="h-10 w-10 flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={handleAddItem} className="w-full py-3 border border-dashed border-zinc-300 rounded-xl text-zinc-500 hover:text-zinc-900 hover:border-zinc-400 hover:bg-zinc-50 transition-all flex items-center justify-center gap-2 text-sm font-medium"><Plus size={16} /> Add Another Item</button>
          </div>

          <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 flex gap-3">
            <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-medium hover:bg-white transition-all">Cancel</button>
            <button onClick={handleSubmit} disabled={!isValid || isSubmitting} className={cn("flex-1 h-11 text-white rounded-xl text-sm font-medium transition-all shadow-md flex items-center justify-center gap-2", isReceive ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100" : "bg-amber-600 hover:bg-amber-700 shadow-amber-100", (!isValid || isSubmitting) && "opacity-50 cursor-not-allowed shadow-none")}>{isSubmitting && <RefreshCcw size={16} className="animate-spin" />} Confirm {isReceive ? 'Receipt' : 'Withdrawal'}</button>
          </div>
        </div>
      </div>

      <ItemSelectorModal isOpen={isPickerOpen} onClose={() => setIsPickerOpen(false)} onSelect={handleSelectItem} data={inventoryData} />
    </>,
    document.body
  );
};

// ... (ExportPreviewModal, CustomSelect, StockStatusBadge) ...
// Copy ExportPreviewModal from previous code here...
const ExportPreviewModal = ({ isOpen, onClose, data }) => {
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
  
    const handleDownload = () => {
      const formattedData = data.map(item => ({
        "Item Code": item.itemCode,
        "Product Name": item.name,
        "Category": item.category,
        "Unit": item.unit,
        "Total Quantity": item.totalQuantity,   
        "Received": item.received,
        "Temp Withdrawn": item.tempWithdrawn,   
        "Balance": item.balance,
        "Status": item.balance === 0 ? "Out of Stock" : item.balance < 5 ? "Low Stock" : "In Stock",
        "Date Added": item.createdAt,           
        "Last Updated": item.updatedAt
      }));
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const wscols = [{ wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 20 }, { wch: 20 }];
      worksheet['!cols'] = wscols;
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory Report");
      XLSX.writeFile(workbook, `Inventory_Stock_${new Date().toISOString().slice(0,10)}.xlsx`);
      onClose();
    };
  
    if (!isMounted) return null;
  
    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className={cn("fixed inset-0 bg-zinc-900/40 backdrop-blur-sm transition-opacity duration-300", isVisible ? "opacity-100" : "opacity-0")} onClick={onClose} />
        <div className={cn("relative bg-white w-full max-w-3xl p-6 rounded-2xl shadow-2xl border border-zinc-100 flex flex-col gap-6 transform transition-all duration-300", isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4")}>
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-50 text-green-600 rounded-xl"><FileSpreadsheet size={24} strokeWidth={1.5} /></div>
              <div><h2 className="text-lg font-semibold text-zinc-900">Export Inventory</h2><p className="text-sm text-zinc-500">Preview data before downloading Excel file.</p></div>
            </div>
            <button onClick={onClose} className="p-2 -mr-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-full transition-colors"><X size={20} /></button>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-zinc-50 p-3 rounded-lg border border-zinc-100"><span className="text-sm text-zinc-500 font-medium">Total Items to Export:</span><span className="text-lg font-bold text-zinc-900">{data.length} <span className="text-xs font-normal text-zinc-400">rows</span></span></div>
            <div className="border border-zinc-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-medium uppercase tracking-wider">
                    <tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Category</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Recv</th><th className="px-4 py-3 text-right">W/D</th><th className="px-4 py-3 text-right">Bal</th><th className="px-4 py-3">Last Update</th></tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {data.slice(0, 5).map((item, idx) => (
                      <tr key={idx} className="bg-white hover:bg-zinc-50/50"><td className="px-4 py-2.5 font-mono text-zinc-500">{item.itemCode}</td><td className="px-4 py-2.5 text-zinc-900 font-medium">{item.name}</td><td className="px-4 py-2.5 text-zinc-500">{item.category}</td><td className="px-4 py-2.5 text-right text-zinc-500">{item.totalQuantity}</td><td className="px-4 py-2.5 text-right text-emerald-600">{item.received}</td><td className="px-4 py-2.5 text-right text-amber-600">{item.tempWithdrawn}</td><td className="px-4 py-2.5 text-right font-bold text-zinc-900">{item.balance}</td><td className="px-4 py-2.5 text-zinc-400">{item.updatedAt}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.length > 5 && <div className="bg-zinc-50 px-4 py-2 text-center text-xs text-zinc-400 italic border-t border-zinc-200">...and {data.length - 5} more items will be included in the file</div>}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-medium hover:bg-zinc-50 transition-all cursor-pointer">Cancel</button>
            <button onClick={handleDownload} className="flex-1 h-11 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-all shadow-md shadow-green-100 flex items-center justify-center gap-2 cursor-pointer"><Download size={16} /> Download .XLSX</button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

const CustomSelect = ({ label, value, onChange, options, placeholder = "Select..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);
    useEffect(() => {
      const handleClick = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false); };
      document.addEventListener("mousedown", handleClick); return () => document.removeEventListener("mousedown", handleClick);
    }, []);
    return (
      <div className="relative w-full mb-3 last:mb-0" ref={wrapperRef}>
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
  
const StockStatusBadge = ({ balance }) => {
    if (balance === 0) return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100"><AlertCircle size={12} /> Out of Stock</span>;
    if (balance < 5) return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100"><AlertCircle size={12} /> Low Stock</span>;
    return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100"><CheckCircle2 size={12} /> In Stock</span>;
  };

// --- MAIN PAGE ---
export default function Inventory() {
  const { showToast } = useToast();
  
  const [searchId, setSearchId] = useState("");
  const [category, setCategory] = useState(""); 
  const [keyword, setKeyword] = useState("");   
  const [variant, setVariant] = useState("");   
  const [sortOrder, setSortOrder] = useState('asc'); 
  const [sortBy, setSortBy] = useState('itemCode'); 
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false); 
  
  const [transactionType, setTransactionType] = useState(null);

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

  const fetchData = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchId) params.append('searchId', searchId);
    if (category) params.append('category', category);
    if (keyword) params.append('keyword', keyword);
    if (variant) params.append('variant', variant);

    const result = await fetchStocks(params.toString());
    const items = Array.isArray(result) ? result : (result.data || []);
    setData(items);
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

  const handleSync = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const params = new URLSearchParams();
    if (searchId) params.append('searchId', searchId);
    if (category) params.append('category', category);
    if (keyword) params.append('keyword', keyword);
    if (variant) params.append('variant', variant);
    const result = await fetchStocks(params.toString());
    const items = Array.isArray(result) ? result : (result.data || []);
    setData(items);
    setLoading(false);
    showToast("Data synchronized successfully", "success");
  };

  const handleTransactionSuccess = (message, type) => {
    showToast(message, type);
    if (type === 'success') fetchData();
  };

  const processedData = useMemo(() => {
    if (!data) return { all: [], paginated: [], totalPages: 0 };
    const sorted = [...data].sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = sorted.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(sorted.length / itemsPerPage);

    return { all: sorted, paginated: currentItems, totalPages };
  }, [data, sortOrder, sortBy, currentPage, itemsPerPage]);

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc'); 
    }
  };

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
      
      {/* MODALS */}
      <ExportPreviewModal 
        isOpen={isExportModalOpen} 
        onClose={() => setIsExportModalOpen(false)} 
        data={processedData.all} 
      />

      {/* Transaction Modal (Handles Both Receive & Withdraw) */}
      <TransactionModal 
        isOpen={!!transactionType} 
        type={transactionType} 
        onClose={() => setTransactionType(null)} 
        onSuccess={handleTransactionSuccess}
        inventoryData={processedData.all}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Inventory Overview</h1>
          <p className="text-zinc-500 text-sm font-light mt-1">Track stock levels and movement.</p>
        </div>
        
        {/* ACTION BUTTONS */}
        <div className="flex items-center gap-3">
           <button 
             onClick={() => setTransactionType('IN')}
             className="h-10 px-4 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-sm font-medium hover:bg-emerald-100 transition-all flex items-center gap-2 shadow-sm active:scale-95"
           >
             <ArrowDownLeft size={16}/> Receive
           </button>
           <button 
             onClick={() => setTransactionType('OUT')}
             className="h-10 px-4 bg-amber-50 text-amber-700 border border-amber-100 rounded-xl text-sm font-medium hover:bg-amber-100 transition-all flex items-center gap-2 shadow-sm active:scale-95"
           >
             <ArrowUpRight size={16}/> Withdraw
           </button>
           
           <div className="h-6 w-px bg-zinc-200 mx-1 hidden md:block"></div>

           <button 
             onClick={handleSync}
             disabled={loading}
             className="h-10 w-10 md:w-auto md:px-4 bg-white border border-zinc-200 text-zinc-600 rounded-xl text-sm font-medium hover:bg-zinc-50 hover:text-zinc-900 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-70"
             title="Sync Data"
           >
             <RefreshCcw size={16} className={cn("transition-all", loading && "animate-spin text-zinc-400")}/> 
             <span className="hidden md:inline">Sync</span>
           </button>
           
           <button 
             onClick={() => setIsExportModalOpen(true)}
             disabled={loading}
             className="h-10 w-10 md:w-auto md:px-4 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-70"
             title="Export Excel"
           >
             <Download size={16}/> 
             <span className="hidden md:inline">Export</span>
           </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-3 w-full">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-800 transition-colors" size={18} />
            <input type="text" placeholder="Search by Item Code or Name..." value={searchId} onChange={(e) => setSearchId(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-100 focus:border-zinc-300 transition-all shadow-sm"
            />
          </div>
          
          <div className="relative" ref={filterRef}>
            <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={cn("h-11 w-11 flex items-center justify-center rounded-xl border transition-all shadow-sm cursor-pointer", isFilterOpen || hasActiveFilters ? "bg-zinc-900 border-zinc-900 text-white" : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50")}>
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
                <th className="px-6 py-4 cursor-pointer hover:bg-zinc-50 transition-colors group/sort select-none" onClick={() => handleSort('itemCode')}>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500 group-hover/sort:text-zinc-900">
                    Item Code
                    <div className="flex flex-col">{sortBy === 'itemCode' ? (sortOrder === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <div className="h-3 w-3" />}</div>
                  </div>
                </th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400">Item Name</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400">Category</th>
                <th className="px-6 py-4 cursor-pointer hover:bg-zinc-50 transition-colors group/sort select-none text-right" onClick={() => handleSort('balance')}>
                   <div className="flex items-center justify-end gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500 group-hover/sort:text-zinc-900">
                    Balance
                    <div className="flex flex-col">{sortBy === 'balance' ? (sortOrder === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <div className="h-3 w-3" />}</div>
                  </div>
                </th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-right">Received</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-right">Withdrawn</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                [...Array(5)].map((_, i) => <tr key={i} className="animate-pulse"><td colSpan="7" className="px-6 py-4"><div className="h-2 bg-zinc-100 rounded w-full"></div></td></tr>)
              ) : processedData.paginated.length > 0 ? (
                processedData.paginated.map((item) => (
                  <tr key={item.itemCode} className="group hover:bg-zinc-50 transition-colors border-b border-zinc-50 last:border-0">
                    <td className="px-6 py-4 font-mono text-zinc-500 text-xs font-medium">{item.itemCode}</td>
                    <td className="px-6 py-4"><div className="flex items-center gap-2"><span className="font-medium text-zinc-900">{item.name}</span></div></td>
                    <td className="px-6 py-4"><span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-100 text-zinc-600 tracking-wide border border-zinc-200/50">{item.category}</span></td>
                    <td className="px-6 py-4 text-right"><span className="font-bold text-zinc-900">{item.balance}</span> <span className="text-xs text-zinc-400 font-normal ml-0.5">{item.unit}</span></td>
                    <td className="px-6 py-4 text-right text-zinc-500">{item.received}</td>
                    <td className="px-6 py-4 text-right text-zinc-500">{item.tempWithdrawn}</td>
                    <td className="px-6 py-4 text-right"><StockStatusBadge balance={item.balance} /></td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="7" className="px-6 py-24 text-center"><div className="flex flex-col items-center justify-center text-zinc-400"><Package size={32} strokeWidth={1} className="mb-2 opacity-50"/><p className="text-sm">No stock data found</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span>Rows:</span>
            <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-white border border-zinc-200 rounded-lg px-2 py-1 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-100 cursor-pointer">
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-500">Page <span className="font-medium text-zinc-900">{currentPage}</span> of <span className="font-medium text-zinc-900">{processedData.totalPages || 1}</span></span>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-white hover:text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={16} /></button>
              <button onClick={() => setCurrentPage(p => Math.min(processedData.totalPages, p + 1))} disabled={currentPage >= processedData.totalPages || processedData.totalPages === 0} className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-white hover:text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}