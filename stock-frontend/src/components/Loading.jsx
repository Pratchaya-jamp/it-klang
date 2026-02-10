import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
        <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center shadow-xl shadow-zinc-200">
          <Loader2 className="text-white animate-spin" size={24} />
        </div>
        <p className="text-zinc-400 text-xs font-medium tracking-widest uppercase">Loading System...</p>
      </div>
    </div>
  );
}