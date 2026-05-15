import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, Filter, ChevronDown, Check, X, Loader2, Pencil, Save,
  Clock, PlayCircle, CheckCircle2, Calendar, Hash, 
  Tag, Monitor, FileText, Image as ImageIcon, ClipboardList, Plus, UploadCloud, Trash2,
  RefreshCw, AlertTriangle, Play
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { request } from '../utils/fetchUtils';
import { useToast } from '../context/ToastContext';

// Utility
function cn(...inputs) { return twMerge(clsx(inputs)); }
const ANIMATION_CLASSES = "transform transition-all duration-200 ease-out will-change-[transform,opacity]";

const calculateDaysLeft = (dateString) => {
  if (!dateString) return 30;
  try {
    const [datePart] = dateString.split(' ');
    const [day, month, year] = datePart.split('/');
    const createdDate = new Date(year, month - 1, day);
    const expireDate = new Date(createdDate);
    expireDate.setDate(expireDate.getDate() + 30);
    
    const today = new Date();
    const diffTime = expireDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  } catch (error) {
    return 30;
  }
};

// --- 1. FILTER & FORM DROPDOWNS ---
const CustomFilterSelect = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  useEffect(() => {
    const handleClick = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClick); 
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  const selectedOption = options.find(opt => opt.value === value) || options[0];
  return (
    <div className="relative w-full sm:w-48" ref={wrapperRef}>
      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 z-10 pointer-events-none" size={16} />
      <button 
        type="button" onClick={() => setIsOpen(!isOpen)} 
        className={cn("w-full h-11 pl-9 pr-3 bg-white border border-zinc-200 rounded-xl text-sm transition-all shadow-sm flex items-center justify-between hover:bg-zinc-50", isOpen ? "ring-2 ring-zinc-100 border-zinc-300" : "", "text-zinc-700 font-medium")}
      >
        <span className="truncate">{selectedOption.label}</span>
        <ChevronDown size={14} className={cn("transition-transform text-zinc-400", isOpen && "rotate-180")} />
      </button>
      {isOpen && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-zinc-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {options.map((opt) => (
            <div key={opt.value} onClick={() => { onChange(opt.value); setIsOpen(false); }} className={cn("px-3 py-2.5 text-sm cursor-pointer hover:bg-zinc-50 transition-colors flex items-center justify-between", value === opt.value ? "bg-zinc-50 font-medium text-zinc-900" : "text-zinc-600")}>
              {opt.label} {value === opt.value && <Check size={14} className="text-zinc-900"/>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CustomFormSelect = ({ value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  useEffect(() => {
    const handleClick = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClick); 
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  return (
    <div className="relative w-full" ref={wrapperRef}>
      <button type="button" onClick={() => setIsOpen(!isOpen)} className={cn("w-full h-11 px-3 rounded-xl text-sm transition-all flex items-center justify-between outline-none text-left border", isOpen ? "bg-white ring-2 ring-zinc-900/10 border-zinc-200" : "bg-zinc-50 border-transparent focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-200 hover:bg-zinc-100/50", !value ? "text-zinc-500" : "text-zinc-900")}>
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown size={16} className={cn("transition-transform text-zinc-400 shrink-0", isOpen && "rotate-180")} />
      </button>
      {isOpen && (
        <div className="absolute z-[60] w-full mt-1 bg-white border border-zinc-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="max-h-48 overflow-y-auto custom-scrollbar">
            {options.map((opt) => (
              <div key={opt} onClick={() => { onChange(opt); setIsOpen(false); }} className={cn("px-3 py-2.5 text-sm cursor-pointer hover:bg-zinc-50 transition-colors flex items-center justify-between", value === opt ? "bg-zinc-50 font-medium text-zinc-900" : "text-zinc-600")}>
                {opt} {value === opt && <Check size={14} className="text-zinc-900"/>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- 2. CREATE TODO MODAL ---
const CreateTodoModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({ jobCode: '', pcName: '', category: '', description: '' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageError, setImageError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const fileInputRef = useRef(null);
  const categories = ['Hardware', 'Software', 'Network'];

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      setFormData({ jobCode: '', pcName: '', category: '', description: '' });
      setImageFile(null); setImagePreview(null); setImageError('');
      requestAnimationFrame(() => requestAnimationFrame(() => setIsVisible(true)));
    } else {
      setIsVisible(false);
      setTimeout(() => setIsMounted(false), 200);
    }
  }, [isOpen]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImageError('');
    if (!file) return;
    const fileName = file.name.toLowerCase();
    const isValidExt = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png') || fileName.endsWith('.webp');
    const isValidMime = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    if (!isValidExt || !isValidMime) { setImageError('ระบบรองรับเฉพาะไฟล์ .jpg, .jpeg, .png และ .webp'); return; }
    if (file.size > 5 * 1024 * 1024) { setImageError('ขนาดรูปภาพต้องไม่เกิน 5MB'); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => { setImageFile(null); setImagePreview(null); setImageError(''); if (fileInputRef.current) fileInputRef.current.value = ''; };
  const isValid = formData.jobCode.trim() !== '' && formData.pcName.trim() !== '' && formData.category !== '' && formData.description.trim() !== '' && imageError === '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('jobCode', formData.jobCode.trim());
      payload.append('pcName', formData.pcName.trim());
      payload.append('category', formData.category);
      payload.append('description', formData.description.trim());
      if (imageFile) payload.append('image', imageFile);

      await request('/api/todos', { method: 'POST', body: payload });
      onSuccess("สร้างใบงานเรียบร้อยแล้ว", "success"); onClose();
    } catch (error) {
      onSuccess(error.message || "เกิดข้อผิดพลาดในการสร้างใบงาน", "error");
    } finally { setIsSubmitting(false); }
  };

  if (!isMounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className={cn("fixed inset-0 bg-zinc-900/50 backdrop-blur-sm transition-opacity duration-200", isVisible ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <div className={cn("relative bg-white w-full max-w-lg max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden", ANIMATION_CLASSES, isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-8")}>
        <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
          <div><h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2"><Plus size={20} className="text-zinc-500" /> สร้างใบงานใหม่</h2></div>
          <button onClick={onClose} className="p-2 -mr-2 text-zinc-400 hover:text-zinc-900 hover:bg-white rounded-full transition-colors"><X size={20} strokeWidth={1.5} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex justify-between">รหัสงาน <span className="text-red-400">*</span></label><input type="text" required value={formData.jobCode} onChange={(e) => setFormData({...formData, jobCode: e.target.value})} placeholder="รหัสงาน เช่น TEST01/2560" className="w-full h-11 px-3 bg-zinc-50 border border-transparent rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-200 transition-all outline-none" /></div>
            <div className="space-y-1"><label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex justify-between">หมวดหมู่ <span className="text-red-400">*</span></label><CustomFormSelect value={formData.category} onChange={(val) => setFormData({...formData, category: val})} options={categories} placeholder="เลือกหมวดหมู่..." /></div>
          </div>
          <div className="space-y-1"><label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex justify-between">ชื่อเครื่อง/อุปกรณ์ <span className="text-red-400">*</span></label><div className="relative"><Monitor size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" /><input type="text" required value={formData.pcName} onChange={(e) => setFormData({...formData, pcName: e.target.value})} placeholder="ชื่อเครื่องPC เช่น PC01" className="w-full h-11 pl-9 pr-3 bg-zinc-50 border border-transparent rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-200 transition-all outline-none" /></div></div>
          <div className="space-y-1"><label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex justify-between">รายละเอียดงาน <span className="text-red-400">*</span></label><textarea required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="กรอกรายละเอียดงาน" className="w-full h-24 p-3 bg-zinc-50 border border-transparent rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-200 transition-all outline-none resize-none" /></div>
          <div className="space-y-1 pt-2">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex justify-between">อัปโหลดรูปภาพ <span className="text-zinc-400 font-normal normal-case">(ไม่บังคับ)</span></label>
            {!imagePreview ? <div onClick={() => fileInputRef.current?.click()} className="w-full h-32 border-2 border-dashed border-zinc-200 rounded-xl bg-zinc-50 hover:bg-zinc-100 flex flex-col items-center justify-center cursor-pointer"><UploadCloud size={20} className="text-zinc-400 mb-2"/><p className="text-sm font-medium text-zinc-600">คลิกเพื่ออัปโหลดรูปภาพ</p></div> : <div className="relative w-full h-40 border border-zinc-200 rounded-xl overflow-hidden bg-zinc-50 group flex items-center justify-center"><img src={imagePreview} className="max-h-full max-w-full object-contain" /><div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><button type="button" onClick={removeImage} className="flex items-center gap-2 bg-white text-red-600 px-4 py-2 rounded-lg text-sm font-bold shadow-lg hover:bg-red-50 transition-colors"><Trash2 size={16} /> ลบรูปภาพ</button></div></div>}
            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" className="hidden" />
          </div>
        </form>
        <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 flex gap-3"><button onClick={onClose} className="flex-1 h-11 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-medium hover:bg-white">ยกเลิก</button><button onClick={handleSubmit} disabled={!isValid || isSubmitting} className="flex-1 h-11 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50">{isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} บันทึก</button></div>
      </div>
    </div>, document.body
  );
};

// --- 3. EDIT TODO MODAL ---
const EditTodoModal = ({ isOpen, onClose, onSuccess, todoData }) => {
  const [formData, setFormData] = useState({ jobCode: '', pcName: '', category: '', description: '' });
  const [imageFile, setImageFile] = useState(null); const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false); const [isMounted, setIsMounted] = useState(false); const [isVisible, setIsVisible] = useState(false);
  const fileInputRef = useRef(null); const categories = ['Hardware', 'Software', 'Network'];

  useEffect(() => {
    if (isOpen && todoData) {
      setIsMounted(true); setFormData({ jobCode: todoData.jobCode||'', pcName: todoData.pcName||'', category: todoData.category||'', description: todoData.description||'' });
      setImageFile(null); setImagePreview(todoData.imageUrl || null);
      requestAnimationFrame(() => requestAnimationFrame(() => setIsVisible(true)));
    } else { setIsVisible(false); setTimeout(() => setIsMounted(false), 200); }
  }, [isOpen, todoData]);

  const isValid = formData.jobCode.trim() !== '' && formData.pcName.trim() !== '' && formData.category !== '' && formData.description.trim() !== '';
  const isChanged = useMemo(() => {
    if (!todoData) return false;
    return formData.jobCode !== todoData.jobCode || formData.pcName !== todoData.pcName || formData.category !== todoData.category || formData.description !== todoData.description || imageFile !== null || (todoData.imageUrl && !imagePreview);
  }, [formData, imageFile, imagePreview, todoData]);

  const handleSubmit = async (e) => {
    e.preventDefault(); if (!isValid || !isChanged || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('jobCode', formData.jobCode.trim()); payload.append('pcName', formData.pcName.trim()); payload.append('category', formData.category); payload.append('description', formData.description.trim());
      if (imageFile) payload.append('image', imageFile); else if (todoData.imageUrl && !imagePreview) payload.append('removeImage', 'true');
      await request(`/api/todos/${todoData.id}`, { method: 'PUT', body: payload });
      onSuccess("อัปเดตเรียบร้อย", "success"); onClose();
    } catch (error) { onSuccess(error.message, "error"); } finally { setIsSubmitting(false); }
  };

  if (!isMounted || !todoData) return null;
  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className={cn("fixed inset-0 bg-zinc-900/50 backdrop-blur-sm transition-opacity", isVisible ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <div className={cn("relative bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden", ANIMATION_CLASSES, isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-8")}>
        <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
          <div><h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2"><Pencil size={20} className="text-blue-500" /> แก้ไขใบงาน</h2></div>
          <button onClick={onClose} className="p-2 -mr-2 text-zinc-400 hover:text-zinc-900 hover:bg-white rounded-full"><X size={20} strokeWidth={1.5} /></button>
        </div>
        <form className="p-6 overflow-y-auto flex-1 space-y-4 max-h-[60vh] custom-scrollbar">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">รหัสงาน</label><input type="text" value={formData.jobCode} onChange={(e) => setFormData({...formData, jobCode: e.target.value})} className="w-full h-11 px-3 bg-zinc-50 border border-transparent rounded-xl text-sm" /></div>
            <div className="space-y-1"><label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">หมวดหมู่</label><CustomFormSelect value={formData.category} onChange={(val) => setFormData({...formData, category: val})} options={categories} /></div>
          </div>
          <div className="space-y-1"><label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">ชื่อเครื่อง/อุปกรณ์</label><input type="text" value={formData.pcName} onChange={(e) => setFormData({...formData, pcName: e.target.value})} className="w-full h-11 px-3 bg-zinc-50 border border-transparent rounded-xl text-sm" /></div>
          <div className="space-y-1"><label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">รายละเอียดงาน</label><textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full h-24 p-3 bg-zinc-50 border border-transparent rounded-xl text-sm resize-none" /></div>
        </form>
        <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 flex gap-3"><button onClick={onClose} className="flex-1 h-11 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-medium hover:bg-white">ยกเลิก</button><button onClick={handleSubmit} disabled={!isValid || !isChanged || isSubmitting} className="flex-1 h-11 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50">{isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {isChanged ? "บันทึกการแก้ไข" : "ไม่มีการเปลี่ยนแปลง"}</button></div>
      </div>
    </div>, document.body
  );
};

// --- 4. TODO DETAIL MODAL (✅ เพิ่มปุ่มแอคชันอัปเดตสถานะ) ---
const TodoDetailModal = ({ isOpen, onClose, todoId, onRefresh }) => {
  const [detail, setDetail] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isMounted, setIsMounted] = useState(false); 
  const [isVisible, setIsVisible] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); 
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen && todoId) { 
      setIsMounted(true); 
      fetchDetail(todoId); 
      requestAnimationFrame(() => requestAnimationFrame(() => setIsVisible(true))); 
    } 
    else { 
      setIsVisible(false); 
      setTimeout(() => { setIsMounted(false); setDetail(null); }, 200); 
    }
  }, [isOpen, todoId]);

  const fetchDetail = async (id) => {
    setLoading(true);
    try { setDetail(await request(`/api/todos/${id}`)); } 
    catch (e) { showToast("ดึงข้อมูลไม่สำเร็จ", "error"); onClose(); } finally { setLoading(false); }
  };

  // ✅ ฟังก์ชันอัปเดตสถานะจาก Modal
  const handleStatusUpdate = async (newStatus) => {
    if (!detail) return;
    setIsUpdatingStatus(true);
    try {
      await request(`/api/todos/${detail.id}/status`, {
        method: 'PATCH',
        body: { status: newStatus }
      });
      showToast("อัปเดตสถานะเรียบร้อย", "success");
      
      if (onRefresh) onRefresh(); // รีเฟรชหน้าบอร์ด
      onClose(); // ✅ เพิ่มคำสั่งนี้เพื่อปิด Modal ทันทีที่อัปเดตสำเร็จ

    } catch (e) {
      showToast("เกิดข้อผิดพลาดในการอัปเดตสถานะ", "error");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'TODO': return 'bg-zinc-100 text-zinc-600 border-zinc-200';
      case 'DOING': return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'DONE': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      default: return 'bg-zinc-100 text-zinc-600 border-zinc-200';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'TODO': return 'รอดำเนินการ';
      case 'DOING': return 'กำลังดำเนินการ';
      case 'DONE': return 'เสร็จสิ้น';
      default: return status;
    }
  };

  if (!isMounted) return null;
  return createPortal(
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className={cn("fixed inset-0 bg-zinc-900/50 backdrop-blur-sm transition-opacity", isVisible ? "opacity-100" : "opacity-0")} onClick={onClose} />
        <div className={cn("relative bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden", ANIMATION_CLASSES, isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-8")}>
          <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2"><ClipboardList size={20} /> รายละเอียดใบงาน</h2>
            <div className="flex gap-2">
              {detail && <button onClick={() => setIsEditModalOpen(true)} className="px-3 py-1.5 flex items-center gap-1.5 text-sm font-medium bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200"><Pencil size={14}/> แก้ไข</button>}
              <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-full"><X size={20} /></button>
            </div>
          </div>
          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
            {loading ? <div className="h-40 flex items-center justify-center text-zinc-400"><Loader2 className="animate-spin" /></div> : detail ? (
              <div className="space-y-6">
                
                {/* ✅ ส่วนแสดงสถานะ + ปุ่มอัปเดตสถานะ */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-zinc-200 bg-zinc-50/50">
                  <div className="flex flex-wrap gap-2">
                    <span className={cn("px-3 py-1.5 rounded-lg text-sm font-bold border flex items-center gap-1.5", getStatusColor(detail.status))}>
                      {detail.status === 'TODO' && <Clock size={16} />}
                      {detail.status === 'DOING' && <PlayCircle size={16} />}
                      {detail.status === 'DONE' && <CheckCircle2 size={16} />}
                      สถานะปัจจุบัน: {getStatusText(detail.status)}
                    </span>
                    <span className="px-3 py-1.5 bg-white text-zinc-600 border border-zinc-200 rounded-lg text-sm font-bold flex items-center gap-1.5 shadow-sm">
                      <Tag size={16} className="text-zinc-400" /> {detail.category}
                    </span>
                  </div>

                  <div className="shrink-0">
                    {detail.status === 'TODO' && (
                      <button 
                        onClick={() => handleStatusUpdate('DOING')} disabled={isUpdatingStatus}
                        className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md shadow-blue-200"
                      >
                        {isUpdatingStatus ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />} เริ่มงาน
                      </button>
                    )}
                    {detail.status === 'DOING' && (
                      <button 
                        onClick={() => handleStatusUpdate('DONE')} disabled={isUpdatingStatus}
                        className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md shadow-emerald-200"
                      >
                        {isUpdatingStatus ? <Loader2 size={16} className="animate-spin" /> : <Check size={18} strokeWidth={3} />} เสร็จสิ้น
                      </button>
                    )}
                    {detail.status === 'DONE' && (
                      <div className="text-sm font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100 flex items-center gap-2">
                        <CheckCircle2 size={18} /> เสร็จสิ้นเมื่อ: <span className="font-medium text-emerald-700">{detail.updatedAt || detail.createdAt}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">เครื่อง/อุปกรณ์ (PC Name)</p>
                    <p className="text-sm font-medium text-zinc-900 flex items-center gap-2 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                      <Monitor size={16} className="text-zinc-400" /> {detail.pcName || '-'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">วันที่สร้างใบงาน</p>
                    <p className="text-sm font-medium text-zinc-900 flex items-center gap-2 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                      <Calendar size={16} className="text-zinc-400" /> {detail.createdAt || '-'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={14} /> รายละเอียดงาน (Description)
                  </p>
                  <div className="text-sm text-zinc-700 bg-white border border-zinc-200 rounded-xl p-4 min-h-[80px] leading-relaxed whitespace-pre-wrap shadow-sm">
                    {detail.description || 'ไม่มีการระบุรายละเอียด'}
                  </div>
                </div>

                {detail.imageUrl && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon size={14} /> รูปภาพแนบ
                    </p>
                    <div className="rounded-xl border border-zinc-200 overflow-hidden bg-zinc-50 flex items-center justify-center p-2">
                      <img src={detail.imageUrl} alt="Job attachment" className="w-full h-auto max-h-[400px] object-contain rounded-lg" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                      <div className="hidden flex-col items-center justify-center py-12 text-zinc-400">
                        <ImageIcon size={32} className="opacity-50 mb-2" />
                        <span className="text-xs">ไม่สามารถโหลดรูปภาพได้</span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="text-right text-xs text-zinc-400 font-medium">อัปเดตล่าสุด: {detail.updatedAt || '-'}</div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <EditTodoModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} todoData={detail} onSuccess={(msg, type) => { showToast(msg, type); if (type === 'success') { fetchDetail(todoId); if (onRefresh) onRefresh(); } }} />
    </>, document.body
  );
};

// --- 5. CONFIRM DELETE POPUP ---
const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, count, isProcessing }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setIsVisible(true)));
    } else {
      setIsVisible(false);
      setTimeout(() => setIsMounted(false), 200);
    }
  }, [isOpen]);

  if (!isMounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <div className={cn("fixed inset-0 bg-zinc-900/60 backdrop-blur-sm transition-opacity", isVisible ? "opacity-100" : "opacity-0")} onClick={!isProcessing ? onClose : undefined} />
      <div className={cn("relative bg-white w-full max-w-sm rounded-2xl shadow-2xl flex flex-col p-6 text-center transform transition-all", isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-8")}>
        <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-red-50"><AlertTriangle size={28} /></div>
        <h3 className="text-xl font-bold text-zinc-900 mb-2">ยืนยันการลบถาวร?</h3>
        <p className="text-sm text-zinc-500 mb-6 leading-relaxed">คุณกำลังจะลบข้อมูลที่เลือกจำนวน <strong className="text-zinc-900">{count}</strong> รายการ <br/><span className="text-red-500 font-medium">การกระทำนี้เป็นการลบถาวรและไม่สามารถกู้คืนได้</span></p>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={isProcessing} className="flex-1 h-11 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-medium hover:bg-zinc-50 transition-colors disabled:opacity-50">ยกเลิก</button>
          <button onClick={onConfirm} disabled={isProcessing} className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md shadow-red-200">{isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} {isProcessing ? "กำลังลบ..." : "ลบถาวร"}</button>
        </div>
      </div>
    </div>, document.body
  );
};

// --- 6. TRASH MODAL ---
const TrashModal = ({ isOpen, onClose, onRefresh }) => {
  const [trashItems, setTrashItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const { showToast } = useToast();

  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      fetchTrash();
      requestAnimationFrame(() => requestAnimationFrame(() => setIsVisible(true)));
    } else {
      setIsVisible(false);
      setSelectedIds([]);
      setTimeout(() => setIsMounted(false), 200);
    }
  }, [isOpen]);

  const fetchTrash = async () => {
    setLoading(true);
    try {
      const data = await request('/api/todos/trash');
      setTrashItems(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast("ดึงข้อมูลถังขยะไม่สำเร็จ", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (id) => { setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); };
  const handleToggleAll = () => { if (selectedIds.length === trashItems.length) setSelectedIds([]); else setSelectedIds(trashItems.map(t => t.id)); };

  const handleRestore = async () => {
    if (!selectedIds.length) return;
    setIsProcessing(true);
    try {
      await request('/api/todos/trash/restore', { method: 'POST', body: { ids: selectedIds } });
      showToast(`กู้คืน ${selectedIds.length} รายการแล้ว`, "success");
      setSelectedIds([]); fetchTrash(); if (onRefresh) onRefresh(); 
    } catch (e) { showToast("เกิดข้อผิดพลาดในการกู้คืน", "error"); } finally { setIsProcessing(false); }
  };

  const handlePermanentDeleteClick = () => { if (!selectedIds.length) return; setIsConfirmDeleteOpen(true); };

  const executePermanentDelete = async () => {
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      await request('/api/todos/trash/permanent', { method: 'DELETE', body: { ids: selectedIds } });
      showToast(`ลบถาวร ${selectedIds.length} รายการแล้ว`, "success");
      setSelectedIds([]); setIsConfirmDeleteOpen(false); fetchTrash();
    } catch (e) {
      showToast("เกิดข้อผิดพลาดในการลบ", "error"); setIsConfirmDeleteOpen(false);
    } finally { setIsProcessing(false); }
  };

  if (!isMounted) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        <div className={cn("fixed inset-0 bg-zinc-900/50 backdrop-blur-sm transition-opacity", isVisible ? "opacity-100" : "opacity-0")} onClick={onClose} />
        <div className={cn("relative bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden", ANIMATION_CLASSES, isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-8")}>
          <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
            <div>
              <h2 className="text-lg font-bold text-red-600 flex items-center gap-2"><Trash2 size={20} /> ถังขยะ (Recycle Bin)</h2>
              <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5"><AlertTriangle size={14} className="text-amber-500"/> รายการจะถูกเก็บไว้ 30 วันก่อนถูกลบถาวรอัตโนมัติ</p>
            </div>
            <button onClick={onClose} className="p-2 -mr-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-full"><X size={20} strokeWidth={1.5} /></button>
          </div>
          <div className="px-6 py-3 border-b border-zinc-100 bg-white flex justify-between items-center">
            <label onClick={handleToggleAll} className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-zinc-700 select-none">
              <div className={cn("w-4 h-4 rounded flex items-center justify-center border transition-all", selectedIds.length > 0 && selectedIds.length === trashItems.length ? "bg-blue-600 border-blue-600" : "border-zinc-300 bg-zinc-50")}>
                {selectedIds.length > 0 && selectedIds.length === trashItems.length && <Check size={12} className="text-white stroke-[3]" />}
              </div>
              เลือกทั้งหมด ({selectedIds.length}/{trashItems.length})
            </label>
            <div className="flex gap-2">
              <button onClick={handleRestore} disabled={!selectedIds.length || isProcessing} className="px-3 py-1.5 text-sm font-medium rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50 flex items-center gap-1.5 transition-colors"><RefreshCw size={14} /> กู้คืน</button>
              <button onClick={handlePermanentDeleteClick} disabled={!selectedIds.length || isProcessing} className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 flex items-center gap-1.5 transition-colors"><Trash2 size={14} /> ลบถาวร</button>
            </div>
          </div>
          <div className="p-6 overflow-y-auto flex-1 bg-zinc-50 custom-scrollbar">
            {loading ? (
              <div className="h-40 flex flex-col items-center justify-center text-zinc-400"><Loader2 className="animate-spin mb-2" /> กำลังโหลด...</div>
            ) : trashItems.length > 0 ? (
              <div className="space-y-3">
                {trashItems.map(item => {
                  const isSelected = selectedIds.includes(item.id);
                  const daysLeft = calculateDaysLeft(item.createdAt);
                  return (
                    <div key={item.id} onClick={() => handleToggleSelect(item.id)} className={cn("bg-white border p-4 rounded-xl flex items-center gap-4 cursor-pointer transition-all hover:shadow-sm", isSelected ? "border-blue-400 ring-1 ring-blue-400 shadow-sm" : "border-zinc-200")}>
                      <div className={cn("w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border transition-all", isSelected ? "bg-blue-600 border-blue-600" : "border-zinc-300 bg-zinc-50")}>
                        {isSelected && <Check size={14} className="text-white stroke-[3]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-zinc-900 text-sm truncate">{item.jobCode}</span>
                          <span className="text-[10px] font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200/50">{item.category}</span>
                        </div>
                        <div className="text-xs text-zinc-500 flex items-center gap-1.5"><Calendar size={12} className="text-zinc-400" /> ลบเมื่อ: {item.createdAt}</div>
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-end gap-1">
                        <span className={cn("text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 border", daysLeft <= 7 ? "bg-red-50 text-red-600 border-red-200" : "bg-orange-50 text-orange-600 border-orange-200")}><Clock size={12} /> เหลือ {daysLeft} วัน</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-40 flex flex-col items-center justify-center text-zinc-400"><Trash2 size={40} strokeWidth={1} className="mb-3 opacity-50" /><p className="text-sm font-medium">ถังขยะว่างเปล่า</p></div>
            )}
          </div>
        </div>
      </div>
      <ConfirmDeleteModal isOpen={isConfirmDeleteOpen} onClose={() => setIsConfirmDeleteOpen(false)} onConfirm={executePermanentDelete} count={selectedIds.length} isProcessing={isProcessing} />
    </>, document.body
  );
};


// --- 7. MAIN PAGE (MY TODOS) ---
export default function MyTodos() {
  const { showToast } = useToast();
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  const [selectedTodoId, setSelectedTodoId] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false); 

  useEffect(() => { fetchTodos(); }, []);

  const fetchTodos = async () => {
    setLoading(true);
    try {
      const data = await request('/api/todos');
      setTodos(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast("ดึงข้อมูลใบงานไม่สำเร็จ", "error"); setTodos([]);
    } finally { setLoading(false); }
  };

  const handleSoftDelete = async (e, id) => {
    e.stopPropagation(); 
    try {
      await request('/api/todos/temp-delete', { method: 'DELETE', body: { ids: [id] } });
      showToast("ย้ายลงถังขยะแล้ว", "success");
      fetchTodos();
    } catch (err) {
      showToast(err.message || "ลบใบงานไม่สำเร็จ", "error");
    }
  };

  // ✅ ฟังก์ชันสำหรับลากวาง (Drag & Drop)
  const handleDragStart = (e, id) => {
    e.dataTransfer.setData('todoId', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // อนุญาตให้วาง
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    const todoIdStr = e.dataTransfer.getData('todoId');
    if (!todoIdStr) return;

    const todoToUpdate = todos.find(t => t.id.toString() === todoIdStr);
    if (!todoToUpdate || todoToUpdate.status === newStatus) return;

    // อัปเดต UI ทันที (Optimistic Update)
    const previousTodos = [...todos];
    setTodos(prev => prev.map(t => t.id.toString() === todoIdStr ? { ...t, status: newStatus } : t));

    try {
      await request(`/api/todos/${todoToUpdate.id}/status`, {
        method: 'PATCH',
        body: { status: newStatus }
      });
      showToast('อัปเดตสถานะสำเร็จ', 'success');
    } catch (err) {
      setTodos(previousTodos); // ถ้ายิง API พลาด ให้คืนค่าสถานะเดิม
      showToast('ไม่สามารถอัปเดตสถานะได้', 'error');
    }
  };

  const categoryOptions = useMemo(() => {
    const cats = [...new Set(todos.map(t => t.category).filter(Boolean))];
    return [{ value: 'All', label: 'ทุกหมวดหมู่' }, ...cats.map(c => ({ value: c, label: c }))];
  }, [todos]);

  const filteredTodos = useMemo(() => {
    return todos.filter(t => {
      const matchesSearch = t.jobCode?.toLowerCase().includes(searchQuery.toLowerCase()) || t.category?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [todos, searchQuery, categoryFilter]);

  const columns = {
    TODO: filteredTodos.filter(t => t.status === 'TODO'),
    DOING: filteredTodos.filter(t => t.status === 'DOING'),
    DONE: filteredTodos.filter(t => t.status === 'DONE')
  };

  const getColConfig = (status) => {
    switch(status) {
      case 'TODO': return { title: 'รอดำเนินการ', icon: Clock, color: 'text-zinc-500', dot: 'bg-zinc-400', bg: 'bg-zinc-100', border: 'border-zinc-200/60' };
      case 'DOING': return { title: 'กำลังดำเนินการ', icon: PlayCircle, color: 'text-blue-600', dot: 'bg-blue-500', bg: 'bg-blue-50/50', border: 'border-blue-100' };
      case 'DONE': return { title: 'เสร็จสิ้น', icon: CheckCircle2, color: 'text-emerald-600', dot: 'bg-emerald-500', bg: 'bg-emerald-50/50', border: 'border-emerald-100' };
      default: return { title: status, icon: Clock, color: 'text-zinc-500', dot: 'bg-zinc-400', bg: 'bg-zinc-50', border: 'border-zinc-200' };
    }
  };

  return (
    <div className="w-full h-full flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <TodoDetailModal isOpen={!!selectedTodoId} onClose={() => setSelectedTodoId(null)} todoId={selectedTodoId} onRefresh={fetchTodos} />
      <CreateTodoModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSuccess={(msg, type) => { showToast(msg, type); if (type === 'success') fetchTodos(); }} />
      <TrashModal isOpen={isTrashModalOpen} onClose={() => setIsTrashModalOpen(false)} onRefresh={fetchTodos} />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 flex items-center gap-2">
            <ClipboardList className="text-zinc-900" size={24}/> ใบงานของฉัน
          </h1>
          <p className="text-zinc-500 text-sm font-light mt-1">ติดตามและจัดการสถานะใบงานซ่อมบำรุงของคุณ</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-800 transition-colors" size={18} />
            <input type="text" placeholder="ค้นหารหัสงาน หรือหมวดหมู่..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-11 pl-10 pr-4 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300 shadow-sm" />
          </div>
          <CustomFilterSelect value={categoryFilter} onChange={setCategoryFilter} options={categoryOptions} />
          
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={() => setIsTrashModalOpen(true)}
              className="h-11 px-3 bg-white text-zinc-600 border border-zinc-200 rounded-xl hover:bg-zinc-50 hover:text-red-600 transition-all flex flex-1 sm:flex-none items-center justify-center shadow-sm active:scale-95"
            >
              <Trash2 size={18} />
            </button>
            <button onClick={() => setIsCreateModalOpen(true)} className="flex-1 sm:flex-none h-11 px-4 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95">
              <Plus size={16} /> <span className="hidden sm:inline">สร้างใบงาน</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex md:grid md:grid-cols-3 gap-4 md:gap-6 items-start overflow-x-auto md:overflow-hidden pb-4 snap-x snap-mandatory hide-scrollbar min-h-0">
        {['TODO', 'DOING', 'DONE'].map((status) => {
          const config = getColConfig(status);
          const items = columns[status];

          return (
            <div 
              key={status} 
              // ✅ กำหนดความกว้างในมือถือให้แคบกว่าจอเล็กน้อย (85vw) เพื่อให้เห็นขอบของคอลัมน์ถัดไป
              className={cn("w-[85vw] sm:w-[340px] md:w-auto shrink-0 snap-center rounded-2xl border flex flex-col h-full", config.bg, config.border)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status)}
            >
              <div className="px-5 py-4 border-b border-inherit flex items-center justify-between bg-white/50 rounded-t-2xl">
                <div className="flex items-center gap-2.5">
                  <div className={cn("w-2.5 h-2.5 rounded-full shadow-sm", config.dot)}></div>
                  <h3 className={cn("font-bold text-sm tracking-wide", config.color)}>{config.title}</h3>
                </div>
                <span className="text-xs font-bold text-zinc-400 bg-white px-2 py-0.5 rounded-full shadow-sm border border-zinc-100">{items.length}</span>
              </div>

              <div className="p-3 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
                {loading ? (
                  [...Array(2)].map((_, i) => <div key={i} className="h-28 bg-white/60 animate-pulse rounded-xl border border-zinc-100"></div>)
                ) : items.length > 0 ? (
                  items.map(todo => (
                    <div 
                      key={todo.id} onClick={() => setSelectedTodoId(todo.id)}
                      draggable 
                      onDragStart={(e) => handleDragStart(e, todo.id)} 
                      className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all cursor-grab active:cursor-grabbing group relative overflow-hidden"
                    >
                      <button 
                        onClick={(e) => handleSoftDelete(e, todo.id)}
                        className="absolute top-2 right-2 p-1.5 bg-red-50 text-red-500 rounded-md opacity-100 md:opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all md:transform md:translate-x-2 md:group-hover:translate-x-0"
                        title="ย้ายลงถังขยะ"
                      >
                        <Trash2 size={14} />
                      </button>

                      <div className="flex justify-between items-start mb-3 pr-8">
                        <span className="font-mono font-bold text-zinc-900 text-sm group-hover:text-blue-600 transition-colors">
                          <Hash size={12} className="inline text-zinc-400 -mt-0.5"/>{todo.jobCode}
                        </span>
                        <span className="text-[10px] font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200/50">{todo.category}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <Calendar size={12} className="text-zinc-400" /> <span>{todo.createdAt}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-zinc-400 opacity-60">
                    <config.icon size={32} strokeWidth={1} className="mb-2" />
                    <p className="text-xs font-medium">ลากมาวางที่นี่</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}