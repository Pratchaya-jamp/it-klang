import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) { return twMerge(clsx(inputs)); }

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null); // Data
  
  // State สำหรับ Animation
  const [isMounted, setIsMounted] = useState(false); // มีตัวตนใน DOM ไหม
  const [isVisible, setIsVisible] = useState(false); // เห็นภาพไหม (CSS Class)
  
  const timerRef = useRef(null);

  const hideToast = useCallback(() => {
    setIsVisible(false); // 1. Trigger Exit Animation (Fade Out / Slide Down)
    
    // 2. รอ 300ms ให้ Animation จบ แล้วค่อยลบออกจาก DOM
    setTimeout(() => {
      setIsMounted(false);
      setToast(null);
    }, 300);
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    // ถ้ามี Timer เก่าค้างอยู่ (กำลังจะปิด) ให้เคลียร์ทิ้งก่อน
    if (timerRef.current) clearTimeout(timerRef.current);

    setToast({ message, type });
    setIsMounted(true); // 1. วาดลง DOM (สถานะเริ่มต้นคือ opacity-0 translate-y-4)

    // 2. รอ 10ms ให้ Browser รับรู้ว่ามีของ แล้วค่อยสั่งให้เด้งขึ้นมา
    setTimeout(() => {
      setIsVisible(true); 
    }, 10);

    // 3. ตั้งเวลาปิดอัตโนมัติ 3 วินาที
    timerRef.current = setTimeout(() => {
      hideToast();
    }, 3000);
  }, [hideToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Render Toast Globally */}
      {isMounted && toast && (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end pointer-events-none">
          <div 
            className={cn(
              "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border min-w-[300px]",
              // Animation Classes
              "transform transition-all duration-300 ease-out", // ความเร็วและความสมูท
              isVisible 
                ? "translate-y-0 opacity-100 scale-100"      // ตอนแสดง: อยู่ที่เดิม ชัดเจน ขนาดปกติ
                : "translate-y-8 opacity-0 scale-95",        // ตอนซ่อน: เลื่อนลงไปข้างล่าง จางหาย หดเล็กลง
                
              // Theme Colors
              toast.type === 'success' ? "bg-white border-emerald-100 text-emerald-700" :
              toast.type === 'error' ? "bg-white border-red-100 text-red-700" :
              "bg-white border-zinc-100 text-zinc-700"
            )}
          >
            {/* Icon */}
            <div className={cn("shrink-0", 
               toast.type === 'success' ? "text-emerald-500" :
               toast.type === 'error' ? "text-red-500" : "text-zinc-500"
            )}>
              {toast.type === 'success' ? <CheckCircle2 size={20} /> :
               toast.type === 'error' ? <AlertCircle size={20} /> : <Info size={20} />}
            </div>

            {/* Content */}
            <span className="text-sm font-medium flex-1">{toast.message}</span>
            
            {/* Close Button */}
            <button onClick={hideToast} className="ml-2 hover:bg-zinc-100/50 rounded-full p-1 transition-colors opacity-60 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};