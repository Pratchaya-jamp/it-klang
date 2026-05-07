import { Link } from 'react-router-dom';
import { BookOpen, Fingerprint, Cookie, Terminal } from 'lucide-react';

export default function MiniFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-zinc-200/60 bg-zinc-50/50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* โลโก้และลิขสิทธิ์ */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-[10px] shadow-sm">
            IT
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-zinc-900 tracking-tight">IT-KLANG Operations</span>
            <span className="text-[10px] text-zinc-500 font-medium">&copy; {currentYear} All rights reserved.</span>
          </div>
        </div>

        {/* เมนูลิงก์ต่างๆ */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs font-medium text-zinc-500">
          <Link to="/about" className="hover:text-zinc-900 transition-colors flex items-center gap-1.5">
            <BookOpen size={14} />
            <span>เกี่ยวกับเรา</span>
          </Link>
          
          {/* หมายเหตุ: ถ้า API Docs เป็นเว็บนอก (เช่น Swagger) ให้เปลี่ยนกลับไปใช้ <a href="URL" target="_blank"> แทนนะครับ */}
          <Link to="/api-docs" className="hover:text-zinc-900 transition-colors flex items-center gap-1.5">
            <Terminal size={14} />
            <span>API Docs</span>
          </Link>
          
          <Link to="/privacy" className="hover:text-zinc-900 transition-colors flex items-center gap-1.5">
            <Fingerprint size={14} />
            <span>นโยบายความเป็นส่วนตัว</span>
          </Link>
          
          <Link to="/cookies" className="hover:text-zinc-900 transition-colors flex items-center gap-1.5">
            <Cookie size={14} />
            <span>นโยบายคุกกี้</span>
          </Link>
        </div>

      </div>
    </footer>
  );
}