import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility
function cn(...inputs) { return twMerge(clsx(inputs)); }

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null); // { message, type: 'success'|'error'|'info' }
  const [isVisible, setIsVisible] = useState(false);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setIsVisible(true);
  }, []);

  const hideToast = useCallback(() => {
    setIsVisible(false);
    // รอ Animation จบ (300ms) แล้วค่อยลบ Data
    setTimeout(() => setToast(null), 300);
  }, []);

  // Auto hide after 3 seconds
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(hideToast, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, hideToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Render Toast Component Globally */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end pointer-events-none">
          <div 
            className={cn(
              "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border transition-all duration-300 ease-out min-w-[300px]",
              isVisible 
                ? "translate-y-0 opacity-100 scale-100" 
                : "translate-y-4 opacity-0 scale-95", // Exit Animation state
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
            <span className="text-sm font-medium text-zinc-800 flex-1">{toast.message}</span>
            
            {/* Close Button */}
            <button onClick={hideToast} className="ml-2 hover:bg-zinc-100 rounded-full p-1 transition-colors text-zinc-400 hover:text-zinc-600">
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};