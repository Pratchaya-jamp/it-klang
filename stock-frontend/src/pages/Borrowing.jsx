import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, ArrowRightLeft, Clock, CheckCircle2, 
  Calendar, Hash, Plus, Filter, AlertCircle, X, Loader2, Undo2, Info
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { request } from '../utils/fetchUtils';
import { useToast } from '../context/ToastContext';

// Utility
function cn(...inputs) { return twMerge(clsx(inputs)); }

// --- 1. BORROW REQUEST MODAL ---
const BorrowModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    itemCode: '',
    quantity: 1,
    jobId: '',
    dueDate: '',
    note: ''
  });

  const [itemName, setItemName] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Animation States
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      setFormData({ itemCode: '', quantity: 1, jobId: '', dueDate: '', note: '' });
      setItemName('');
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      setTimeout(() => setIsMounted(false), 300);
    }
  }, [isOpen]);

  // Real-time Item Code Validation
  useEffect(() => {
    const fetchItemName = async () => {
      if (!formData.itemCode || formData.itemCode.length < 3) {
        setItemName('');
        return;
      }
      
      setIsValidating(true);
      try {
        const response = await request(`/api/items/dashboard?searchId=${formData.itemCode}`);
        const itemsList = response?.data || [];
        const foundItem = itemsList.find(item => item.itemCode === formData.itemCode);

        if (foundItem) {
          setItemName(foundItem.name);
        } else {
          setItemName('Item not found');
        }
      } catch (error) {
        setItemName('Item not found');
      } finally {
        setIsValidating(false);
      }
    };

    const debounceTimer = setTimeout(fetchItemName, 500);
    return () => clearTimeout(debounceTimer);
  }, [formData.itemCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (itemName === 'Item not found' || !itemName) return; 

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

      onSuccess("Borrow request submitted successfully", "success");
      onClose();
    } catch (error) {
      onSuccess(error.message || "Failed to submit borrow request", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  if (!isMounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className={cn("absolute inset-0 bg-zinc-900/40 backdrop-blur-sm transition-opacity duration-300 ease-out", isVisible ? "opacity-100" : "opacity-0")} onClick={onClose} />
      
      <div className={cn("relative bg-white w-full max-w-md p-6 rounded-2xl shadow-2xl border border-zinc-100 flex flex-col transform transition-all duration-300 ease-out", isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4")}>
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 tracking-tight flex items-center gap-2">
              <ArrowRightLeft size={20} className="text-zinc-900" />
              New Borrow Request
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">Fill details to request an equipment loan.</p>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-full transition-colors">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Item Code</label>
            <div className="relative">
              <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text" 
                required 
                placeholder="Ex. 999999999" 
                value={formData.itemCode} 
                onChange={e => setFormData({...formData, itemCode: e.target.value})} 
                className="w-full h-11 pl-9 pr-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all outline-none" 
              />
            </div>
            <div className="h-5 px-1 flex items-center">
              {isValidating ? (
                 <span className="flex items-center gap-1.5 text-xs text-zinc-400"><Loader2 size={12} className="animate-spin"/> Validating item...</span>
              ) : itemName === 'Item not found' ? (
                 <span className="flex items-center gap-1.5 text-xs text-red-500 font-medium"><X size={12}/> {itemName}</span>
              ) : itemName ? (
                 <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium"><CheckCircle2 size={12}/> {itemName}</span>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Quantity</label>
              <input 
                type="number" 
                required 
                min="1"
                value={formData.quantity} 
                onChange={e => setFormData({...formData, quantity: e.target.value})} 
                className="w-full h-11 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all outline-none" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Job ID</label>
              <input 
                type="text" 
                required 
                placeholder="ITSERV1"
                value={formData.jobId} 
                onChange={e => setFormData({...formData, jobId: e.target.value.toUpperCase()})} 
                className="w-full h-11 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all outline-none" 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Expected Due Date</label>
            <div className="relative">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              <input 
                type="date" 
                required 
                min={today}
                value={formData.dueDate} 
                onChange={e => setFormData({...formData, dueDate: e.target.value})} 
                className="w-full h-11 pl-10 pr-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all outline-none cursor-text" 
              />
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1 flex items-center justify-between">
              Note <span className="text-zinc-300 font-normal normal-case">(Optional)</span>
            </label>
            <input 
              type="text" 
              placeholder="Ex. For emergency server maintenance"
              value={formData.note} 
              onChange={e => setFormData({...formData, note: e.target.value})} 
              className="w-full h-11 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all outline-none" 
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-medium hover:bg-zinc-50 transition-all active:scale-95">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || isValidating || itemName === 'Item not found' || !itemName} className="flex-1 h-11 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-zinc-200 active:scale-95">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};


// --- 2. RETURN CONFIRM MODAL ---
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
          <h3 className="text-lg font-bold text-zinc-900">Confirm Return</h3>
          <p className="text-sm text-zinc-500 mt-1">Please verify the item details before confirming the return.</p>
        </div>

        <div className="bg-zinc-50 rounded-xl p-4 space-y-3 mb-6 border border-zinc-100">
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-500">Transaction:</span>
            <span className="font-mono font-medium text-zinc-900">{transaction.transactionId}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-500">Item Code:</span>
            <span className="font-mono font-medium text-zinc-900">{transaction.itemCode}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-500">Item Name:</span>
            <span className="font-medium text-zinc-900 text-right truncate max-w-[150px]" title={transaction.itemName}>{transaction.itemName}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-500">Job ID:</span>
            <span className="font-medium text-zinc-900">{transaction.jobId || '-'}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} disabled={isSubmitting} className="flex-1 h-11 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-medium hover:bg-zinc-50 transition-all">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={isSubmitting} className="flex-1 h-11 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100 flex items-center justify-center gap-2">
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Confirm Return
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};


// --- 3. MAIN PAGE ---
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
      showToast("Failed to fetch borrowing history", "error");
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
      
      // Update UI real-time
      setTransactions(prev => prev.map(t => 
        t.transactionId === transactionId ? { ...t, status: 'Returned' } : t
      ));
      
      showToast("Item returned successfully", "success");
      setReturningTransaction(null);
    } catch (error) {
      showToast(error.message || "Failed to return item", "error");
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
    return new Intl.DateTimeFormat('en-GB', {
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
            Borrowing History
          </h1>
          <p className="text-zinc-500 text-sm font-light mt-1">
            Track equipment loans, returns, and current statuses.
          </p>
        </div>
        
        <button 
          onClick={() => setIsBorrowModalOpen(true)}
          className="h-11 px-5 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-sm shadow-zinc-200 active:scale-95"
        >
          <Plus size={16} /> 
          <span>New Borrow Request</span>
        </button>
      </div>

      {/* Toolbar: Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-800 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search by Transaction, Item Code, Name or Job ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-100 focus:border-zinc-300 transition-all shadow-sm" 
          />
        </div>
        
        <div className="relative w-full sm:w-48">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full h-11 pl-9 pr-8 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-100 focus:border-zinc-300 transition-all shadow-sm appearance-none cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Borrowed">Borrowed</option>
            <option value="Returned">Returned</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/30">
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">Transaction</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-500">Item Details</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-500 text-center">Qty</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">Job ID & Recorder</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">Timeline</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">Status</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-500 text-right whitespace-nowrap">Actions</th>
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
                        <span className="text-xs text-zinc-500 mt-0.5">by {t.recorderName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                          <Calendar size={12} className="text-zinc-400" />
                          <span className="w-12 text-zinc-400">Borrow:</span>
                          <span className="font-mono">{formatDate(t.borrowDate)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                          <AlertCircle size={12} className="text-zinc-400" />
                          <span className="w-12 text-zinc-400">Due:</span>
                          <span className="font-mono">{formatDate(t.dueDate)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {t.status === 'Borrowed' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200/60 uppercase tracking-wide">
                          <Clock size={12} strokeWidth={2.5}/> Borrowed
                        </span>
                      ) : t.status === 'Returned' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 uppercase tracking-wide">
                          <CheckCircle2 size={12} strokeWidth={2.5}/> Returned
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
                          title="Return Item"
                        >
                          <Undo2 size={14} /> 
                          <span className="hidden sm:inline">Return</span>
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
                      <p className="text-sm text-zinc-500 font-medium">No records found</p>
                      <p className="text-xs mt-1">Try adjusting your search or filters.</p>
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