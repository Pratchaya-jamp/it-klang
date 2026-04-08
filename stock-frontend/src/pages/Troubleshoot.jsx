import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  LifeBuoy, Search, Clock, CheckCircle2, 
  MessageSquare, Reply, Ticket, Plus, X, Loader2, Send, User, Mail, Hash, Star, StarHalf
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { request } from '../utils/fetchUtils';
import { useToast } from '../context/ToastContext';

// Utility
function cn(...inputs) { return twMerge(clsx(inputs)); }

// Animation คลาสสำหรับ Modal
const ANIMATION_CLASSES = "transform transition-all duration-200 ease-out will-change-[transform,opacity]";

// --- 1. RATING MODAL (รองรับครึ่งดาว) ---
const RatingModal = ({ isOpen, onClose, onSuccess, ticketNo }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      setRating(0);
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      setTimeout(() => setIsMounted(false), 200);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Loading 2 วิ
      
      await request(`/api/support/ticket/${ticketNo}/rate`, {
        method: 'POST',
        body: JSON.stringify({ rating })
      });

      onSuccess(`Rated ${rating} stars successfully`, "success", rating);
      onClose();
    } catch (error) {
      onSuccess(error.message || "Failed to submit rating", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className={cn("fixed inset-0 bg-zinc-900/50 backdrop-blur-sm transition-opacity duration-200", isVisible ? "opacity-100" : "opacity-0")} onClick={onClose} />
      
      <div className={cn("relative bg-white w-full max-w-sm p-8 rounded-3xl shadow-2xl border border-zinc-100 flex flex-col items-center text-center", ANIMATION_CLASSES, isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4")}>
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-4">
          <Star size={32} className="fill-amber-500" />
        </div>
        
        <h2 className="text-xl font-bold text-zinc-900">Rate our Service</h2>
        <p className="text-sm text-zinc-500 mt-2 mb-8">How satisfied are you with the resolution of Ticket <span className="font-mono font-bold text-zinc-800">{ticketNo}</span>?</p>

        {/* Star Selection Area */}
        <div className="flex items-center gap-1 mb-10">
          {[1, 2, 3, 4, 5].map((starIdx) => (
            <div key={starIdx} className="relative w-10 h-10 cursor-pointer flex">
              {/* ซีกซ้าย (0.5) */}
              <div 
                className="w-1/2 h-full absolute left-0 z-10"
                onMouseEnter={() => setHover(starIdx - 0.5)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(starIdx - 0.5)}
              />
              {/* ซีกขวา (1.0) */}
              <div 
                className="w-1/2 h-full absolute right-0 z-10"
                onMouseEnter={() => setHover(starIdx)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(starIdx)}
              />
              
              {/* Star Icon Display */}
              <div className="pointer-events-none">
                { (hover || rating) >= starIdx ? (
                  <Star size={40} className="text-amber-400 fill-amber-400" />
                ) : (hover || rating) >= starIdx - 0.5 ? (
                  <div className="relative">
                    <Star size={40} className="text-zinc-200" />
                    <div className="absolute inset-0 overflow-hidden w-1/2">
                      <Star size={40} className="text-amber-400 fill-amber-400" />
                    </div>
                  </div>
                ) : (
                  <Star size={40} className="text-zinc-200" />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 w-full">
          <button onClick={onClose} className="flex-1 h-12 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-medium hover:bg-zinc-50 transition-all">
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || rating === 0}
            className="flex-[2] h-12 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-zinc-200"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
            Submit Rating ({rating})
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// --- 2. NEW TICKET MODAL (เหมือนเดิม) ---
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
      const fetchUser = async () => {
        setIsLoadingUser(true);
        try {
          const res = await request('/api/auth/me');
          const data = res?.data || res || {};
          setUserInfo({ staffId: data.staffId || data.id || '-', name: data.name || '-', email: data.email || '-' });
        } catch (err) {} finally { setIsLoadingUser(false); }
      };
      fetchUser();
      setTimeout(() => setIsVisible(true), 10);
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
      await new Promise(resolve => setTimeout(resolve, 2000));
      await request('/api/support/ticket', { method: 'POST', body: JSON.stringify({ note: note.trim() }) });
      onSuccess("Support ticket submitted successfully", "success");
      onClose();
    } catch (error) { onSuccess(error.message || "Failed to submit ticket", "error"); } 
    finally { setIsSubmitting(false); }
  };

  if (!isMounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className={cn("fixed inset-0 bg-zinc-900/50 backdrop-blur-sm transition-opacity duration-200", isVisible ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <div className={cn("relative bg-white w-full max-w-md p-6 rounded-2xl shadow-2xl border border-zinc-100 flex flex-col", ANIMATION_CLASSES, isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4")}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2"><Ticket size={20} /> Submit New Ticket</h2>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-900 rounded-full"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-zinc-50/50 border border-zinc-200/60 rounded-xl p-4 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-zinc-500">Staff ID:</span><span className="font-mono font-medium text-zinc-900">{userInfo.staffId}</span></div>
            <div className="flex justify-between text-sm"><span className="text-zinc-500">Name:</span><span className="font-medium text-zinc-900">{userInfo.name}</span></div>
          </div>
          <div className="space-y-1 pt-2">
            <label className="text-[11px] font-bold text-zinc-400 uppercase ml-1">Issue Description</label>
            <textarea required rows={4} placeholder="Describe the problem..." value={note} onChange={e => setNote(e.target.value)} className="w-full p-3 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900/10 outline-none resize-none" />
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-medium hover:bg-zinc-50">Cancel</button>
            <button type="submit" disabled={isSubmitting || isLoadingUser || !note.trim()} className="flex-1 h-11 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 flex items-center justify-center gap-2">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Submit
            </button>
          </div>
        </form>
      </div>
    </div>, document.body
  );
};


// --- 3. MAIN TROUBLESHOOT PAGE ---
export default function Troubleshoot() {
  const { showToast } = useToast();
  
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal States
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ratingTicketNo, setRatingTicketNo] = useState(null); // เก็บ TicketNo ที่กำลังจะประเมิน

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

  useEffect(() => { fetchTickets(); }, []);

  const filteredTickets = useMemo(() => {
    if (!Array.isArray(tickets)) return [];
    return tickets.filter(t => {
      const searchTxt = searchQuery.toLowerCase();
      return t.ticketNo?.toLowerCase().includes(searchTxt) || t.note?.toLowerCase().includes(searchTxt);
    });
  }, [tickets, searchQuery]);

  // เมื่อประเมินสำเร็จ
  const handleRatingSuccess = (msg, type, newRating) => {
    showToast(msg, type);
    if (type === 'success') {
      // ✅ อัปเดต UI Real-time
      setTickets(prev => prev.map(t => {
        if (t.ticketNo === ratingTicketNo) {
          return {
            ...t,
            rating: newRating,
            ratedAt: new Date().toLocaleString('en-GB').replace(',', '')
          };
        }
        return t;
      }));
    }
  };

  const renderStatusBadge = (status) => {
    const statusLower = status?.toLowerCase();
    if (statusLower === 'resolved') {
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 uppercase tracking-wide"><CheckCircle2 size={12} strokeWidth={2.5}/> Resolved</span>;
    }
    return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200/60 uppercase tracking-wide"><Clock size={12} strokeWidth={2.5}/> {status || 'Pending'}</span>;
  };

  return (
    <div className="max-w-5xl mx-auto pb-20 px-4 md:px-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <NewTicketModal isOpen={isTicketModalOpen} onClose={() => setIsTicketModalOpen(false)} onSuccess={(msg, type) => { showToast(msg, type); if (type === 'success') fetchTickets(); }} />

      <RatingModal isOpen={!!ratingTicketNo} onClose={() => setRatingTicketNo(null)} ticketNo={ratingTicketNo} onSuccess={handleRatingSuccess} />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 flex items-center gap-2"><LifeBuoy className="text-zinc-900" size={24}/> Support Tickets</h1>
          <p className="text-zinc-500 text-sm font-light mt-1">Track your issue reports and communication with the development team.</p>
        </div>
        <button onClick={() => setIsTicketModalOpen(true)} className="h-10 px-4 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 flex items-center gap-2 shadow-sm active:scale-95"><Plus size={16} /> <span>New Ticket</span></button>
      </div>

      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-800 transition-colors" size={18} />
        <input type="text" placeholder="Search by Ticket No. or issue..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-11 pl-10 pr-4 bg-white border border-zinc-200 rounded-xl text-sm outline-none transition-all shadow-sm" />
      </div>

      <div className="space-y-4">
        {loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-zinc-200/60 p-5 shadow-sm animate-pulse h-40"></div>)
        ) : filteredTickets.length > 0 ? (
          filteredTickets.map((ticket, index) => (
            <div key={index} className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/30">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-500"><Ticket size={20} /></div>
                  <div>
                    <h3 className="font-mono text-sm font-bold text-zinc-900">{ticket.ticketNo}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-0.5"><Clock size={12} /><span>{ticket.createdAt}</span></div>
                  </div>
                </div>
                {renderStatusBadge(ticket.status)}
              </div>

              <div className="p-5">
                <div className="flex gap-3">
                  <MessageSquare size={16} className="text-zinc-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">{ticket.note}</p>
                </div>
              </div>

              {ticket.replyMessage && (
                <div className="px-5 pb-5">
                  <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5 relative mt-2">
                    <div className="absolute -top-3 left-6 bg-white px-2 text-xs font-bold text-blue-600 border border-blue-100 rounded-full flex items-center gap-1.5">
                      <Reply size={12} /> Response from {ticket.repliedBy || 'Support Team'}
                    </div>
                    <p className="text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">{ticket.replyMessage}</p>
                    
                    {/* ✅ Footer: Replied Time + Evaluation Status/Button */}
                    <div className="mt-4 pt-3 border-t border-blue-200/60 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 text-[11px] text-blue-500 font-medium">
                        <Clock size={12} /> Replied at {ticket.repliedAt}
                      </div>

                      <div className="flex items-center gap-2">
                        {ticket.ratedAt ? (
                          /* โชว์เมื่อประเมินแล้ว */
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                            <Star size={12} className={cn(ticket.rating > 0 && "fill-emerald-500")} />
                            Evaluated on {ticket.ratedAt}
                          </div>
                        ) : (
                          /* ปุ่มโชว์เมื่อยังไม่ประเมิน */
                          <button 
                            onClick={() => setRatingTicketNo(ticket.ticketNo)}
                            className="flex items-center gap-1.5 text-[11px] font-bold text-amber-600 bg-white hover:bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 transition-all active:scale-95"
                          >
                            <Star size={12} /> Rate Service
                          </button>
                        )}
                      </div>
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
          </div>
        )}
      </div>
    </div>
  );
}