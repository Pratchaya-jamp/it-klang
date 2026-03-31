import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  LifeBuoy, Search, Clock, CheckCircle2, 
  MessageSquare, Reply, Ticket, Plus, X, Loader2, Send, User, Mail, Hash
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { request } from '../utils/fetchUtils';
import { useToast } from '../context/ToastContext';

// Utility
function cn(...inputs) { return twMerge(clsx(inputs)); }

// Animation คลาสสำหรับ Modal ให้เด้งลื่นๆ
const ANIMATION_CLASSES = "transform transition-all duration-200 ease-out will-change-[transform,opacity]";

// --- 1. NEW TICKET MODAL ---
const NewTicketModal = ({ isOpen, onClose, onSuccess }) => {
  const [note, setNote] = useState('');
  const [userInfo, setUserInfo] = useState({ staffId: '', name: '', email: '' });
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      setNote('');
      
      // ดึงข้อมูล User มาล็อคไว้ในฟอร์ม
      const fetchUser = async () => {
        setIsLoadingUser(true);
        try {
          const res = await request('/api/auth/me');
          const data = res?.data || res || {};
          setUserInfo({
            staffId: data.staffId || data.id || data.username || '-',
            name: data.name || '-',
            email: data.email || '-'
          });
        } catch (err) {
          console.error("Failed to load user info", err);
        } finally {
          setIsLoadingUser(false);
        }
      };
      fetchUser();

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      setIsVisible(false);
      setTimeout(() => setIsMounted(false), 200);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;

    setIsSubmitting(true);
    try {
      // หน่วงเวลา 2 วินาที ตาม Requirement
      await new Promise(resolve => setTimeout(resolve, 2000));

      const payload = {
        note: note.trim()
      };

      await request('/api/support/ticket', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      onSuccess("Support ticket submitted successfully", "success");
      onClose();
    } catch (error) {
      onSuccess(error.message || "Failed to submit ticket", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className={cn("fixed inset-0 bg-zinc-900/50 backdrop-blur-sm transition-opacity duration-200 ease-out", isVisible ? "opacity-100" : "opacity-0")} onClick={onClose} />
      
      <div className={cn("relative bg-white w-full max-w-md p-6 rounded-2xl shadow-2xl border border-zinc-100 flex flex-col", ANIMATION_CLASSES, isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4")}>
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 tracking-tight flex items-center gap-2">
              <Ticket size={20} className="text-zinc-900" />
              Submit New Ticket
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">Report an issue to the web development team.</p>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-full transition-colors">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* ข้อมูล User ที่ถูกล็อค (Read-only) */}
          <div className="bg-zinc-50/50 border border-zinc-200/60 rounded-xl p-4 space-y-3 relative overflow-hidden">
            {isLoadingUser && (
              <div className="absolute inset-0 bg-zinc-50/80 backdrop-blur-[1px] flex items-center justify-center z-10">
                <Loader2 size={18} className="animate-spin text-zinc-400" />
              </div>
            )}
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Reporter Information</h4>
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-500 flex items-center gap-1.5"><Hash size={14}/> Staff ID:</span>
              <span className="font-mono font-medium text-zinc-900">{userInfo.staffId}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-500 flex items-center gap-1.5"><User size={14}/> Name:</span>
              <span className="font-medium text-zinc-900">{userInfo.name}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-500 flex items-center gap-1.5"><Mail size={14}/> Email:</span>
              <span className="font-medium text-zinc-900 truncate max-w-[180px]" title={userInfo.email}>{userInfo.email}</span>
            </div>
          </div>

          {/* ช่องกรอก Note */}
          <div className="space-y-1 pt-2">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1 flex items-center gap-1.5">
              <MessageSquare size={12} /> Issue Description
            </label>
            <textarea 
              required
              rows={4}
              placeholder="Please describe the problem you're experiencing in detail..."
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full p-3 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 outline-none transition-all resize-none shadow-sm"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-medium hover:bg-zinc-50 transition-all active:scale-95">
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting || isLoadingUser || !note.trim()} 
              className="flex-1 h-11 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-zinc-200 active:scale-95"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Submit Ticket
            </button>
          </div>
        </form>

      </div>
    </div>,
    document.body
  );
};


// --- 2. MAIN TROUBLESHOOT PAGE ---
export default function Troubleshoot() {
  const { showToast } = useToast();
  
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const response = await request('/api/support/my-tickets');
      setTickets(response?.data || []);
    } catch (error) {
      showToast("Failed to load tickets", "error");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const filteredTickets = useMemo(() => {
    if (!Array.isArray(tickets)) return [];
    return tickets.filter(t => {
      const searchTxt = searchQuery.toLowerCase();
      return t.ticketNo?.toLowerCase().includes(searchTxt) || 
             t.note?.toLowerCase().includes(searchTxt);
    });
  }, [tickets, searchQuery]);

  const renderStatusBadge = (status) => {
    const statusLower = status?.toLowerCase();
    if (statusLower === 'resolved') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 uppercase tracking-wide">
          <CheckCircle2 size={12} strokeWidth={2.5}/> Resolved
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200/60 uppercase tracking-wide">
        <Clock size={12} strokeWidth={2.5}/> {status || 'Pending'}
      </span>
    );
  };

  return (
    <div className="max-w-5xl mx-auto pb-20 px-4 md:px-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 🚀 Render Modal สำหรับเปิด Ticket ใหม่ */}
      <NewTicketModal 
        isOpen={isTicketModalOpen} 
        onClose={() => setIsTicketModalOpen(false)} 
        onSuccess={(msg, type) => {
          showToast(msg, type);
          if (type === 'success') fetchTickets(); // โหลด List ใหม่เมื่อบันทึกเสร็จ
        }}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 flex items-center gap-2">
            <LifeBuoy className="text-zinc-900" size={24}/>
            Support Tickets
          </h1>
          <p className="text-zinc-500 text-sm font-light mt-1">
            Track your issue reports and communication with the development team.
          </p>
        </div>
        
        {/* 🚀 ปุ่มสำหรับเปิด Modal */}
        <button 
          onClick={() => setIsTicketModalOpen(true)}
          className="h-10 px-4 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-sm shadow-zinc-200 active:scale-95"
        >
          <Plus size={16} /> 
          <span>New Ticket</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-800 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search by Ticket No. or issue description..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-100 focus:border-zinc-300 transition-all shadow-sm" 
          />
        </div>
      </div>

      {/* Ticket List (Card Layout) */}
      <div className="space-y-4">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-zinc-200/60 p-5 shadow-sm animate-pulse flex flex-col gap-4">
              <div className="flex justify-between items-center"><div className="h-5 bg-zinc-100 rounded w-32"></div><div className="h-6 bg-zinc-100 rounded-full w-20"></div></div>
              <div className="h-4 bg-zinc-100 rounded w-3/4"></div>
              <div className="h-16 bg-zinc-50 rounded-xl w-full mt-2"></div>
            </div>
          ))
        ) : filteredTickets.length > 0 ? (
          filteredTickets.map((ticket, index) => (
            <div key={index} className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
              
              <div className="px-5 py-4 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-4 bg-zinc-50/30">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-500">
                    <Ticket size={20} />
                  </div>
                  <div>
                    <h3 className="font-mono text-sm font-bold text-zinc-900">{ticket.ticketNo}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-0.5">
                      <Clock size={12} />
                      <span>{ticket.createdAt}</span>
                    </div>
                  </div>
                </div>
                <div>
                  {renderStatusBadge(ticket.status)}
                </div>
              </div>

              <div className="p-5">
                <div className="flex gap-3">
                  <MessageSquare size={16} className="text-zinc-400 shrink-0 mt-0.5" />
                  <div className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
                    {ticket.note || <span className="text-zinc-400 italic">No description provided.</span>}
                  </div>
                </div>
              </div>

              {ticket.replyMessage && (
                <div className="px-5 pb-5">
                  <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 relative mt-2">
                    <div className="absolute -top-3 left-6 bg-white px-2 text-xs font-bold text-blue-600 border border-blue-100 rounded-full flex items-center gap-1.5">
                      <Reply size={12} />
                      Response from {ticket.repliedBy || 'Support Team'}
                    </div>
                    
                    <p className="text-sm text-blue-900 mt-2 whitespace-pre-wrap leading-relaxed">
                      {ticket.replyMessage}
                    </p>
                    
                    <div className="flex items-center gap-1.5 text-[11px] text-blue-400 mt-3 font-medium">
                      <Clock size={12} />
                      <span>Replied on {ticket.repliedAt}</span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          ))
        ) : (
          <div className="bg-white rounded-2xl border border-zinc-200/60 p-16 flex flex-col items-center justify-center text-center shadow-sm">
            <LifeBuoy size={48} strokeWidth={1} className="text-zinc-300 mb-4" />
            <h3 className="text-lg font-medium text-zinc-900">No tickets found</h3>
            <p className="text-sm text-zinc-500 mt-1 max-w-sm">
              You haven't submitted any support tickets yet, or none match your search criteria.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}