import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid, Package, ArrowRightLeft, Settings, Bell, User, } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function Navbar() {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutGrid },
    { name: 'Inventory', path: '/inventory', icon: Package },
    { name: 'Borrowing', path: '/borrowing', icon: ArrowRightLeft }, // ยืม-คืน-เบิก
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-zinc-100">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        
        {/* LOGO AREA */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
            IT
          </div>
          <span className="font-semibold text-lg tracking-tight text-zinc-900">
            IT-KLANG
          </span>
        </div>

        {/* CENTER NAVIGATION */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                  isActive 
                    ? "text-zinc-900 bg-zinc-100/80" 
                    : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                )}
              >
                <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* RIGHT ACTIONS */}
        <div className="flex items-center gap-2 pl-4 md:pl-0">
          <button className="relative w-9 h-9 flex items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-colors">
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
          </button>
          
          <div className="h-6 w-px bg-zinc-200 mx-1"></div>

          <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-100">
            <div className="w-7 h-7 bg-zinc-100 rounded-full flex items-center justify-center border border-zinc-200 text-zinc-600">
               <User size={14} />
            </div>
            <span className="text-xs font-medium text-zinc-700 hidden sm:block">Admin</span>
          </button>
        </div>
      </div>
    </nav>
  );
}