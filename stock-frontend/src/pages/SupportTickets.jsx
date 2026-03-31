import { useState, useEffect, useMemo } from 'react';
import { 
  Ticket, Search, Clock, CheckCircle2, MessageSquare, 
  Send, User, Mail, Hash, Loader2, Reply, Calendar, Package 
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { request } from '../utils/fetchUtils';
import { useToast } from '../context/ToastContext';

function cn(...inputs) { return twMerge(clsx(inputs)); }

export default function SupportTickets() {
  const { showToast } = useToast();
  
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // เก็บ State ของข้อความ Reply แยกตาม TicketNo
  const [replyTexts, setReplyTexts] = useState({});
  const [submittingIds, setSubmittingIds] = useState({});

  useEffect(() => {
    const fetchAllTickets = async () => {
      setLoading(true);
      try {
        const response = await request('/api/support/tickets');
        setTickets(response?.data || []);
      } catch (error) {
        showToast("Failed to load tickets", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchAllTickets();
  }, []);

  const filteredTickets = useMemo(() => {
    if (!Array.isArray(tickets)) return [];
    return tickets.filter(t => {
      const searchTxt = searchQuery.toLowerCase();
      return t.ticketNo?.toLowerCase().includes(searchTxt) || 
             t.name?.toLowerCase().includes(searchTxt) ||
             t.note?.toLowerCase().includes(searchTxt);
    });
  }, [tickets, searchQuery]);

  // ฟังก์ชันส่งข้อความตอบกลับ
  const handleSendReply = async (ticketNo) => {
    const message = replyTexts[ticketNo];
    if (!message || !message.trim()) return;

    setSubmittingIds(prev => ({ ...prev, [ticketNo]: true }));

    try {
      // 🚀 หน่วงเวลา 2 วินาทีตามความต้องการ
      await new Promise(resolve => setTimeout(resolve, 2000));

      await request(`/api/support/ticket/${ticketNo}/reply`, {
        method: 'PUT',
        body: JSON.stringify({ replyMessage: message.trim() })
      });

      // ✅ อัปเดตสถานะใน List ทันทีแบบ Real-time
      setTickets(prev => prev.map(t => {
        if (t.ticketNo === ticketNo) {
          return {
            ...t,
            status: 'Resolved',
            replyMessage: message.trim(),
            repliedAt: new Date().toLocaleString('en-GB').replace(',', '') // จำลองวันเวลาที่ตอบ
          };
        }
        return t;
      }));

      showToast(`Replied to ${ticketNo} successfully`, "success");
      setReplyTexts(prev => ({ ...prev, [ticketNo]: '' })); // เคลียร์ข้อความ
    } catch (error) {
      showToast(error.message || "Failed to send reply", "error");
    } finally {
      setSubmittingIds(prev => ({ ...prev, [ticketNo]: false }));
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4 md:px-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="pt-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 flex items-center gap-2">
          <Ticket className="text-zinc-900" size={24}/>
          Support Management
        </h1>
        <p className="text-zinc-500 text-sm font-light mt-1">
          Review and respond to issues reported by users.
        </p>
      </div>

      {/* Toolbar */}
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-800 transition-colors" size={18} />
        <input 
          type="text" 
          placeholder="Search by Ticket No, Name, or Issue..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-11 pl-10 pr-4 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-100 focus:border-zinc-300 transition-all shadow-sm" 
        />
      </div>

      {/* Tickets List */}
      <div className="space-y-6">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-zinc-200/60 p-6 shadow-sm animate-pulse space-y-4">
              <div className="h-5 bg-zinc-100 rounded w-1/4"></div>
              <div className="h-20 bg-zinc-50 rounded-xl"></div>
            </div>
          ))
        ) : filteredTickets.length > 0 ? (
          filteredTickets.map((ticket, index) => (
            <div key={index} className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden flex flex-col">
              
              {/* Header Info */}
              <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/30 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <div className="flex items-center gap-2">
                    <Hash size={14} className="text-zinc-400" />
                    <span className="font-mono text-sm font-bold text-zinc-900">{ticket.ticketNo}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-600">
                    <User size={14} className="text-zinc-400" />
                    <span className="font-medium">{ticket.name} ({ticket.staffId})</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-600">
                    <Mail size={14} className="text-zinc-400" />
                    <span>{ticket.email}</span>
                  </div>
                </div>
                
                {ticket.status?.toLowerCase() === 'resolved' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 uppercase tracking-wide">
                    <CheckCircle2 size={12} /> Resolved
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200/60 uppercase tracking-wide">
                    <Clock size={12} /> Pending
                  </span>
                )}
              </div>

              <div className="p-6">
                {/* User Message */}
                <div className="flex gap-4 mb-6">
                  <div className="h-10 w-10 shrink-0 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500">
                    <MessageSquare size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-zinc-900">Issue Description</span>
                      <span className="text-[10px] text-zinc-400">{ticket.createdAt}</span>
                    </div>
                    <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{ticket.note}</p>
                  </div>
                </div>

                {/* Reply Section */}
                {ticket.status?.toLowerCase() === 'pending' ? (
                  <div className="flex items-end gap-3 ml-14">
                    <div className="flex-1 relative group">
                      <textarea 
                        placeholder="Write your response here..."
                        value={replyTexts[ticket.ticketNo] || ''}
                        onChange={(e) => setReplyTexts({ ...replyTexts, [ticket.ticketNo]: e.target.value })}
                        className="w-full p-4 pr-12 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-400 transition-all outline-none resize-none min-h-[80px]"
                      />
                      <button 
                        onClick={() => handleSendReply(ticket.ticketNo)}
                        disabled={!replyTexts[ticket.ticketNo]?.trim() || submittingIds[ticket.ticketNo]}
                        className={cn(
                          "absolute right-3 bottom-3 h-9 w-9 rounded-xl flex items-center justify-center transition-all shadow-sm",
                          replyTexts[ticket.ticketNo]?.trim() && !submittingIds[ticket.ticketNo]
                            ? "bg-zinc-900 text-white hover:scale-105 active:scale-95" 
                            : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                        )}
                      >
                        {submittingIds[ticket.ticketNo] ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Show Reply if Resolved */
                  <div className="ml-14 bg-blue-50/50 border border-blue-100 rounded-2xl p-5 relative">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                        <Reply size={12} />
                      </div>
                      <span className="text-xs font-bold text-blue-700">Response from {ticket.repliedBy || 'Support Team'}</span>
                    </div>
                    <p className="text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">{ticket.replyMessage}</p>
                    <div className="mt-3 flex items-center gap-1.5 text-[10px] text-blue-400 font-medium">
                      <Calendar size={10} />
                      <span>Replied at {ticket.repliedAt}</span>
                    </div>
                  </div>
                )}
              </div>

            </div>
          ))
        ) : (
          <div className="bg-white rounded-3xl border border-zinc-200/60 p-20 flex flex-col items-center justify-center text-center">
            <Package size={48} strokeWidth={1} className="text-zinc-200 mb-4" />
            <p className="text-zinc-500 font-medium">No tickets found in the system</p>
          </div>
        )}
      </div>

    </div>
  );
}