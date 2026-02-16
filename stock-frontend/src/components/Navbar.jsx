import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutGrid, Package, ArrowRightLeft, Settings, Bell, User, 
  Users, LogOut, ChevronDown, Loader2 
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { request } from '../utils/fetchUtils'; // เรียกใช้ request ตัวเดิม
import { useAuth } from '../context/AuthContext'; // เรียกใช้ AuthContext

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function Navbar() {
  const location = useLocation();
  const { user, logout } = useAuth(); // ดึงฟังก์ชัน logout มาใช้

  // --- STATE ---
  const [userData, setUserData] = useState(null); // เก็บข้อมูล User
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // เปิด/ปิด Dropdown
  const [isLoggingOut, setIsLoggingOut] = useState(false); // สถานะกำลัง Logout

  const dropdownRef = useRef(null);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutGrid },
    { name: 'Inventory', path: '/inventory', icon: Package },
    { name: 'Borrowing', path: '/borrowing', icon: ArrowRightLeft },
    { name: 'Audit Log', path: '/audit', icon: Settings },
  ];

  // --- EFFECT: Fetch User Data ---
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await request('/api/auth/me');
        // ตาม Payload ตัวอย่าง: { data: { ... } }
        if (response.data) {
          setUserData(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      }
    };
    fetchUserData();
  }, []);

  // --- EFFECT: Click Outside to Close Dropdown ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- HANDLER: Logout ---
  const handleLogout = async () => {
    setIsLoggingOut(true); // เริ่มหมุนติ้วๆ
    
    // หน่วงเวลา 2 วินาที
    await new Promise(resolve => setTimeout(resolve, 2000));

    // เรียก logout ของ Context (ซึ่งจะจัดการยิง API /logout และ Redirect)
    await logout();
  };

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

          {/* USER PROFILE DROPDOWN */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-100 group"
            >
              <div className="w-7 h-7 bg-zinc-100 rounded-full flex items-center justify-center border border-zinc-200 text-zinc-600 group-hover:bg-white group-hover:shadow-sm transition-all">
                 <User size={14} />
              </div>
              <div className="hidden sm:flex flex-col items-start text-left">
                  <span className="text-xs font-semibold text-zinc-700 leading-none">
                    {userData?.name || 'Loading...'}
                  </span>
                  {/* Option: แสดง Role เล็กๆ ด้านล่างชื่อ */}
                  {/* <span className="text-[10px] text-zinc-400 leading-none mt-0.5">{userData?.role}</span> */}
              </div>
              <ChevronDown size={12} className={`text-zinc-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* DROPDOWN MENU */}
            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-zinc-100 py-1 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                <div className="px-4 py-2 border-b border-zinc-50 md:hidden">
                    <p className="text-sm font-medium text-zinc-900">{userData?.name}</p>
                    <p className="text-xs text-zinc-500 truncate">{userData?.email}</p>
                </div>
                
                <div className="p-1">
                  <Link 
                  to="/profile" 
                  onClick={() => setIsDropdownOpen(false)} // ปิด Dropdown เมื่อกด
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 rounded-lg transition-colors text-left"
                >
                  <User size={16} />
                  My Profile
                </Link>
                  {(user?.role === 'SuperAdmin' || user?.data?.role === 'SuperAdmin') && (
                  <Link 
                    to="/user-manage"
                    onClick={() => setIsDropdownOpen(false)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 rounded-lg transition-colors text-left"
                  >
                    <Users size={16} /> {/* อย่าลืม import Users (มี s) */}
                    User Management
                  </Link>
                )}
                </div>

                <div className="h-px bg-zinc-50 mx-2 my-1"></div>

                <div className="p-1">
                  <button 
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoggingOut ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Signing out...
                      </>
                    ) : (
                      <>
                        <LogOut size={14} />
                        Sign out
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}