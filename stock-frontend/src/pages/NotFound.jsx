import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 py-20 animate-in fade-in zoom-in-95 duration-500">
      <div className="w-20 h-20 bg-zinc-100 rounded-3xl flex items-center justify-center text-zinc-400 mb-6 shadow-sm border border-zinc-200/50">
        <FileQuestion size={40} strokeWidth={1.5} />
      </div>
      <h1 className="text-4xl font-bold text-zinc-900 tracking-tight mb-2">404</h1>
      <h2 className="text-lg font-medium text-zinc-700 mb-6">Page Not Found</h2>
      <p className="text-sm text-zinc-500 max-w-md mb-8 leading-relaxed">
        ขออภัย ไม่พบหน้าที่คุณกำลังค้นหา หน้าเว็บนี้อาจถูกลบ ย้าย หรือคุณอาจพิมพ์ URL ผิด
      </p>
      <Link 
        to="/dashboard" 
        className="h-11 px-6 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-sm active:scale-95"
      >
        <ArrowLeft size={16} />
        กลับสู่หน้าหลัก
      </Link>
    </div>
  );
}