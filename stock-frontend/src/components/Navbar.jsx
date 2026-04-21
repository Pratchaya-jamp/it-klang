import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutGrid, Package, ArrowRightLeft, Settings, Bell, User, 
  Users, LogOut, ChevronDown, Loader2, Activity, CheckCheck, X, LifeBuoy, Ticket 
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { request } from '../utils/fetchUtils';
import { useAuth } from '../context/AuthContext';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function Navbar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  // --- STATE ---
  const [userData, setUserData] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // --- NOTIFICATION STATE ---
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  const navItems = [
    { name: 'หน้าหลัก', path: '/dashboard', icon: LayoutGrid },
    { name: 'คลัง', path: '/inventory', icon: Package },
    { name: 'บันทึกการยืม', path: '/borrowing', icon: ArrowRightLeft },
    { name: 'ข้อมูลในระบบ', path: '/audit', icon: Settings },
  ];

  // --- EFFECT: Fetch User Data ---
  useEffect(() => {
    if (!user) {
      setUserData(null);
      return;
    }

    const fetchUserData = async () => {
      try {
        const response = await request('/api/auth/me');
        if (response.data) {
          setUserData(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      }
    };
    if (user) fetchUserData();
  }, [user]);

  // --- EFFECT: Fetch Notifications ---
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;
      try {
        // ✅ 1. ยิง API ดึงข้อมูลทั้ง 2 เส้นพร้อมๆ กัน เพื่อความรวดเร็ว
        const [unreadRes, historyRes] = await Promise.all([
          request('/api/notifications/unread').catch(() => ({ data: [] })),
          request('/api/notifications/history').catch(() => ({ data: [] }))
        ]);
        
        // แกะข้อมูล data ออกมา (ถ้าไม่มีให้เป็น Array ว่าง)
        const unreadArray = unreadRes?.data || [];
        const historyArray = historyRes?.data || [];
        
        // ✅ 2. นำข้อมูลทั้ง 2 แหล่งมารวมกัน
        const combinedNotifs = [...unreadArray, ...historyArray];
        
        // ✅ 3. กรองข้อมูลที่ซ้ำกันออก (เผื่อ unread ไปซ้ำกับ history) โดยใช้ id เป็นตัวเช็ค
        const uniqueMap = new Map();
        combinedNotifs.forEach(notif => {
          if (!uniqueMap.has(notif.id)) {
            uniqueMap.set(notif.id, notif);
          }
        });
        
        // ✅ 4. แปลงกลับเป็น Array และเรียงลำดับวันที่จาก "ใหม่ล่าสุด" ไป "เก่าที่สุด"
        const uniqueNotifs = Array.from(uniqueMap.values()).sort((a, b) => {
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
        
        // ✅ 5. สร้าง flag _readLocally โดยอ้างอิงจากสถานะ isRead จาก Backend
        // (ถ้า isRead = true แปลว่าอ่านแล้ว _readLocally ก็จะเป็น true ทำให้ UI แสดงผลแบบจางๆ ทันที)
        const formattedNotifs = uniqueNotifs.map(n => ({ 
          ...n, 
          _readLocally: n.isRead || false 
        }));
        
        setNotifications(formattedNotifs);
        
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    };
    fetchNotifications();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    let isMounted = true; // ✅ 1. เพิ่ม Flag เช็คสถานะการเมานต์

    const connection = new HubConnectionBuilder()
      .withUrl('/hubs/notification') // (แก้เป็น URL เต็มถ้าใช้วิธีที่ 2)
      .configureLogging(LogLevel.Information)
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveNotification", (newNotif) => {
      setNotifications(prev => {
        if (prev.some(n => n.id === newNotif.id)) return prev;
        const formattedNotif = { ...newNotif, _readLocally: false };
        return [formattedNotif, ...prev];
      });
    });

    const startConnection = async () => {
      try {
        await connection.start();
        if (isMounted) {
          console.log("🟢 SignalR Connected successfully!");
        }
      } catch (err) {
        // ✅ 2. ถ้า Error เกิดตอนที่ Component ถูกทำลายไปแล้ว (Strict Mode) จะไม่พ่น Error สีแดง
        if (isMounted) {
          console.error("🔴 SignalR Connection Error: ", err);
        } else {
          console.log("🟡 SignalR start aborted due to React Strict Mode unmount (Normal behavior).");
        }
      }
    };

    startConnection();

    // 3. Cleanup Function
    return () => {
      isMounted = false; // ✅ อัปเดต Flag ว่า Component โดนถอดแล้ว
      connection.off("ReceiveNotification");
      connection.stop();
    };
  }, [user]);

  // --- EFFECT: Click Outside to Close Dropdowns ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- HANDLER: Mark Notification as Read (Hover) ---
  const handleMarkAsRead = async (id, isAlreadyRead) => {
    if (isAlreadyRead) return;

    // อัปเดต UI ให้จางลงทันที (Optimistic Update)
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, _readLocally: true } : n
    ));

    try {
      await request(`/api/notifications/read/${id}`, { method: 'PUT' });
    } catch (error) {
      console.error(`Failed to mark notification ${id} as read:`, error);
    }
  };

  // --- HANDLER: Read All Notifications ---
  const handleReadAll = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, _readLocally: true })));
    try {
      await request('/api/notifications/read-all', { method: 'PUT' });
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  // --- HANDLER: Logout ---
  const handleLogout = async () => {
    setIsLoggingOut(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    await logout();
  };

  const unreadCount = notifications.filter(n => !n._readLocally).length;

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
          
          {/* ✅ NOTIFICATION BELL (โชว์เฉพาะตอน Login แล้ว) */}
          {user && (
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => {
                  setIsNotifOpen(!isNotifOpen);
                  setIsDropdownOpen(false); // ปิด Profile Dropdown
                }}
                className="relative w-9 h-9 flex items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                )}
              </button>

              {/* NOTIFICATION BOX */}
              {/* ✅ NOTIFICATION BOX (เปลี่ยนมาใช้ transition แทนการลบ DOM) */}
              <div 
                className={cn(
                  "absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-zinc-100 overflow-hidden z-50 origin-top-right transition-all duration-300 ease-out",
                  // ถ้าเปิด: โชว์ชัดเจน, ขนาดปกติ, เลื่อนลงมาตำแหน่งเดิม
                  // ถ้าปิด: โปร่งใส, หดเล็กลงนิดนึง, เลื่อนขึ้นไปซ่อน, และกดไม่ได้
                  isNotifOpen 
                    ? "opacity-100 scale-100 translate-y-0 visible" 
                    : "opacity-0 scale-95 -translate-y-2 invisible pointer-events-none"
                )}
              >
                
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
                  <h3 className="text-sm font-bold text-zinc-900">การแจ้งเตือน</h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={handleReadAll}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                    >
                      <CheckCheck size={14} /> อ่านทั้งหมด
                    </button>
                  )}
                </div>

                  {/* List */}
                <div 
                  className={cn(
                    "max-h-[300px] overflow-y-auto overscroll-contain scroll-smooth",
                    // Custom Scrollbar Styling
                    "[&::-webkit-scrollbar]:w-1.5", // ขนาดความกว้าง
                    "[&::-webkit-scrollbar-track]:bg-transparent", // สีพื้นหลัง Track
                    "[&::-webkit-scrollbar-thumb]:bg-zinc-200 [&::-webkit-scrollbar-thumb]:rounded-full", // สีและความโค้งมนของตัวเลื่อน
                    "hover:[&::-webkit-scrollbar-thumb]:bg-zinc-300 transition-colors" // สีตอนเอาเมาส์ไปชี้ที่ตัวเลื่อน
                  )}
                >
                  {/* ... เนื้อหาข้างใน Notifications.map เหมือนเดิม ... */}
                  {notifications.length > 0 ? (
                    <div className="divide-y divide-zinc-50">
                      {notifications.map((notif) => (
                        <div 
                          key={notif.id}
                          onMouseEnter={() => handleMarkAsRead(notif.id, notif._readLocally)}
                          className={cn(
                            "p-4 transition-all duration-300",
                            notif._readLocally ? "bg-white opacity-60" : "bg-blue-50/30 hover:bg-blue-50/60"
                          )}
                        >
                          <div className="flex gap-3">
                            <div className="mt-1.5 shrink-0">
                              <div className={cn("w-2 h-2 rounded-full", notif._readLocally ? "bg-transparent" : "bg-blue-500")}></div>
                            </div>
                            <div>
                              <p className={cn("text-sm", notif._readLocally ? "text-zinc-600 font-medium" : "text-zinc-900 font-bold")}>
                                {notif.title || notif.action || 'Notification'}
                              </p>
                              <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                                {notif.message || notif.note || 'No additional details.'}
                              </p>
                              <p className="text-[10px] text-zinc-400 font-mono mt-2">
                                {new Date(notif.createdAt || notif.timestamp).toLocaleString('th-TH')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center flex flex-col items-center justify-center">
                      <Bell size={24} className="text-zinc-200 mb-2" />
                      <p className="text-sm text-zinc-500">ยังไม่พบรายการแจ้งเตือน</p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
          
          <div className="h-6 w-px bg-zinc-200 mx-1"></div>

          {/* USER PROFILE DROPDOWN */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => {
                setIsDropdownOpen(!isDropdownOpen);
                setIsNotifOpen(false); // ปิด Notification Dropdown
              }}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-100 group"
            >
              <div className="w-7 h-7 bg-zinc-100 rounded-full flex items-center justify-center border border-zinc-200 text-zinc-600 group-hover:bg-white group-hover:shadow-sm transition-all">
                 <User size={14} />
              </div>
              <div className="hidden sm:flex flex-col items-start text-left">
                  <span className="text-xs font-semibold text-zinc-700 leading-none">
                    {userData?.name || 'Loading...'}
                  </span>
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
                  onClick={() => setIsDropdownOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 rounded-lg transition-colors text-left"
                >
                  <User size={16} />
                  ข้อมูลส่วนตัว
                </Link>
                  {(user?.role === 'SuperAdmin' || user?.data?.role === 'SuperAdmin' || userData?.role === 'SuperAdmin') && (
                  <>
                    <Link 
                      to="/user-manage"
                      onClick={() => setIsDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 rounded-lg transition-colors text-left"
                    >
                      <Users size={16} />
                      การจัดการผู้ใช้ในระบบ
                    </Link>

                    <Link 
                      to="/access-logs"
                      onClick={() => setIsDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 rounded-lg transition-colors text-left"
                    >
                      <Activity size={16} />
                      ข้อมูลบันทึกเข้าใช้งานระบบ
                    </Link>
                  </>
                )}
                
                </div>

                <div className="h-px bg-zinc-50 mx-2 my-1"></div>

                <div className="p-1">
                  {(user?.role !== 'WebSupporter' && userData?.role !== 'WebSupporter') && (
                    <Link 
                      to="/troubleshoot"
                      onClick={() => setIsDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 rounded-lg transition-colors text-left"
                    >
                      <LifeBuoy size={16} />
                      ติดต่อ Support
                    </Link>
                  )}
                  {(user?.role === 'WebSupporter' || userData?.role === 'WebSupporter') && (
                    <Link 
                      to="/support-tickets"
                      onClick={() => setIsDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 rounded-lg transition-colors text-left"
                    >
                      <Ticket size={16} />
                      กล่องTickets
                    </Link>
                  )}
                  <button 
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoggingOut ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        กำลังออกจากระบบ. . .
                      </>
                    ) : (
                      <>
                        <LogOut size={14} />
                        ออกจากระบบ
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