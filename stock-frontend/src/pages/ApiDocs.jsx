import { useState } from 'react';
import { 
  Terminal, ShieldCheck, Package, ArrowRightLeft, LifeBuoy, 
  Copy, Check, Code2, Server, Bell, ListTodo, History
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility Function
function cn(...inputs) { return twMerge(clsx(inputs)); }

// --- ข้อมูล API ENDPOINTS ทั้งหมด ---
const apiSections = [
  {
    title: "Authentication & Users",
    description: "ระบบยืนยันตัวตน, จัดการสิทธิ์ และ Audit Logs",
    icon: ShieldCheck,
    color: "text-purple-600",
    bg: "bg-purple-50",
    endpoints: [
      { method: "POST", path: "/api/auth/login", desc: "เข้าสู่ระบบเพื่อรับ JWT Token" },
      { method: "POST", path: "/api/auth/register", desc: "ลงทะเบียนผู้ใช้งานใหม่" },
      { method: "POST", path: "/api/auth/logout", desc: "ออกจากระบบ (ลบ Session/Token)" },
      { method: "GET", path: "/api/auth/me", desc: "ดึงข้อมูลโปรไฟล์ของผู้ใช้งานปัจจุบัน" },
      { method: "PUT", path: "/api/auth/profile", desc: "อัปเดตข้อมูลโปรไฟล์ส่วนตัว" },
      { method: "POST", path: "/api/auth/change-password", desc: "เปลี่ยนรหัสผ่านของผู้ใช้งานปัจจุบัน" },
      { method: "POST", path: "/api/auth/forgot-password", desc: "แจ้งลืมรหัสผ่านเพื่อรับลิงก์ทางอีเมล" },
      { method: "GET", path: "/api/auth/validate-reset-token", desc: "ตรวจสอบความถูกต้องของ Token สำหรับรีเซ็ตรหัสผ่าน" },
      { method: "POST", path: "/api/auth/reset-password-token", desc: "ตั้งรหัสผ่านใหม่ด้วย Token" },
      { method: "GET", path: "/api/auth/admin/users", desc: "(Admin) ดึงข้อมูลผู้ใช้งานทั้งหมดในระบบ" },
      { method: "PUT", path: "/api/auth/admin/users/{staffId}", desc: "(Admin) อัปเดตข้อมูลและสิทธิ์ผู้ใช้งาน" },
      { method: "POST", path: "/api/auth/admin/request-otp", desc: "(Admin) ร้องขอ OTP เพื่อสิทธิ์แก้ไขขั้นสูง" },
      { method: "POST", path: "/api/auth/admin/reset-password", desc: "(Admin) ยืนยัน OTP และรีเซ็ตรหัสผ่านให้ผู้ใช้อื่น" },
      { method: "GET", path: "/api/audit/login-logs", desc: "ดึงประวัติการเข้าสู่ระบบทั้งหมด" },
      { method: "GET", path: "/api/audit/login-logs/{staffId}", desc: "ดึงประวัติการเข้าสู่ระบบเฉพาะบุคคล" }
    ]
  },
  {
    title: "Inventory & Dashboard",
    description: "ระบบจัดการคลังและข้อมูลอุปกรณ์",
    icon: Package,
    color: "text-blue-600",
    bg: "bg-blue-50",
    endpoints: [
      { method: "GET", path: "/api/items/dashboard", desc: "ดึงรายการอุปกรณ์ทั้งหมด (รองรับ Query Params เพื่อ Search/Filter)" },
      { method: "POST", path: "/api/items", desc: "เพิ่มอุปกรณ์ใหม่เข้าสู่คลัง" },
      { method: "PUT", path: "/api/items/{code}", desc: "แก้ไขรายละเอียดข้อมูลอุปกรณ์" },
      { method: "DELETE", path: "/api/items/{code}", desc: "ลบอุปกรณ์ออกจากระบบ" },
      { method: "GET", path: "/api/stocks/overview", desc: "ดึงข้อมูลสต็อกคงเหลือและยอดการเคลื่อนไหวทั้งหมด" }
    ]
  },
  {
    title: "Transactions",
    description: "ระบบคำขอสั่งซื้อ (PR), ขอเบิก (Withdraw) และตัดจำหน่าย (Write-off)",
    icon: ArrowRightLeft,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    endpoints: [
      { method: "GET", path: "/api/transactions/purchase/request", desc: "ดึงรายการคำขอสั่งซื้ออุปกรณ์ (PR)" },
      { method: "POST", path: "/api/transactions/purchase/request", desc: "สร้างรายการคำขอสั่งซื้ออุปกรณ์ (PR)" },
      { method: "GET", path: "/api/transactions/withdraw/request", desc: "ดึงรายการคำขอเบิกอุปกรณ์" },
      { method: "POST", path: "/api/transactions/withdraw/request", desc: "สร้างรายการคำขอเบิกอุปกรณ์ออกจากคลัง" },
      { method: "POST", path: "/api/transactions/withdraw/approve", desc: "อนุมัติการเบิกจ่ายอุปกรณ์" },
      { method: "POST", path: "/api/transactions/receive", desc: "ทำรายการรับอุปกรณ์เข้าสต็อก (ทั้งรับใหม่และรับคืน)" },
      { method: "POST", path: "/api/transactions/write-off", desc: "ทำรายการตัดจำหน่ายอุปกรณ์ (Write-off)" },
      { method: "GET", path: "/api/transactions/write-off/summary", desc: "ดึงประวัติและสรุปยอดตัดจำหน่ายทั้งหมด" },
      { method: "GET", path: "/api/transactions/purchase/history", desc: "ดึงประวัติการสั่งซื้อทั้งหมด" },
      { method: "GET", path: "/api/transactions/withdraw/history", desc: "ดึงประวัติการเบิกอุปกรณ์ทั้งหมด" },
      { method: "GET", path: "/api/transactions/purchase/cancel", desc: "ดึงประวัติการยกเลิกคำขอสั่งซื้อ" },
      { method: "POST", path: "/api/transactions/purchase/cancel", desc: "ยกเลิกคำขอสั่งซื้อ (PR)" },
      { method: "GET", path: "/api/transactions/withdraw/cancel", desc: "ดึงประวัติการยกเลิกคำขอเบิก" },
      { method: "POST", path: "/api/transactions/withdraw/cancel", desc: "ยกเลิกคำขอเบิกอุปกรณ์" }
    ]
  },
  {
    title: "Borrowing",
    description: "ระบบขอยืมและคืนอุปกรณ์",
    icon: ArrowRightLeft,
    color: "text-orange-600",
    bg: "bg-orange-50",
    endpoints: [
      { method: "GET", path: "/api/borrow/history", desc: "ดึงประวัติการยืม-คืนอุปกรณ์ทั้งหมด" },
      { method: "POST", path: "/api/borrow/request", desc: "สร้างคำขอยืมอุปกรณ์ใหม่ (ระบุระยะเวลา)" },
      { method: "POST", path: "/api/borrow/return/{transactionId}", desc: "ทำรายการคืนอุปกรณ์ที่ยืม" }
    ]
  },
  {
    title: "Support Tickets",
    description: "ระบบแจ้งปัญหา (Helpdesk) และการประเมิน",
    icon: LifeBuoy,
    color: "text-amber-600",
    bg: "bg-amber-50",
    endpoints: [
      { method: "GET", path: "/api/support/my-tickets", desc: "ดึงรายการใบแจ้งปัญหาของตนเอง" },
      { method: "GET", path: "/api/support/tickets", desc: "ดึงรายการใบแจ้งปัญหาทั้งหมด (Support/Admin)" },
      { method: "POST", path: "/api/support/ticket", desc: "สร้างใบแจ้งปัญหาใหม่" },
      { method: "PUT", path: "/api/support/ticket/{ticketNo}/reply", desc: "ตอบกลับหรืออัปเดตสถานะใบแจ้งปัญหา" },
      { method: "POST", path: "/api/support/ticket/{ticketNo}/rate", desc: "ประเมินความพึงพอใจการแก้ปัญหา" }
    ]
  },
  {
    title: "Tasks & Todos",
    description: "ระบบจัดการใบงานและรายการสิ่งที่ต้องทำ",
    icon: ListTodo,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    endpoints: [
      { method: "GET", path: "/api/todos", desc: "ดึงรายการใบงานทั้งหมดของผู้ใช้งาน" },
      { method: "POST", path: "/api/todos", desc: "สร้างใบงานใหม่" },
      { method: "GET", path: "/api/todos/{id}", desc: "ดึงรายละเอียดของใบงาน" },
      { method: "PUT", path: "/api/todos/{id}", desc: "อัปเดตข้อมูลใบงานทั้งหมด" },
      { method: "PATCH", path: "/api/todos/{id}/status", desc: "อัปเดตเฉพาะสถานะของใบงาน" },
      { method: "GET", path: "/api/todos/trash", desc: "ดึงรายการใบงานในถังขยะ" },
      { method: "DELETE", path: "/api/todos/temp-delete", desc: "ลบใบงานไปที่ถังขยะ (Soft Delete)" },
      { method: "POST", path: "/api/todos/trash/restore", desc: "กู้คืนใบงานจากถังขยะ" },
      { method: "DELETE", path: "/api/todos/trash/permanent", desc: "ลบใบงานทิ้งถาวร (Hard Delete)" },
      { method: "GET", path: "/api/todos/image/{fileName}", desc: "ดึงรูปภาพแนบในใบงาน" }
    ]
  },
  {
    title: "Notifications",
    description: "ระบบการแจ้งเตือนภายในแอปพลิเคชัน",
    icon: Bell,
    color: "text-rose-600",
    bg: "bg-rose-50",
    endpoints: [
      { method: "GET", path: "/api/notifications/unread", desc: "ดึงรายการแจ้งเตือนที่ยังไม่ได้อ่าน" },
      { method: "GET", path: "/api/notifications/history", desc: "ดึงประวัติการแจ้งเตือนทั้งหมด" },
      { method: "PUT", path: "/api/notifications/read/{id}", desc: "เปลี่ยนสถานะการแจ้งเตือนเป็น 'อ่านแล้ว'" },
      { method: "PUT", path: "/api/notifications/read-all", desc: "เปลี่ยนการแจ้งเตือนทั้งหมดเป็น 'อ่านแล้ว'" }
    ]
  },
  {
    title: "Audit Logs",
    description: "ระบบเก็บประวัติการทำธุรกรรมเชิงลึกของข้อมูล",
    icon: History,
    color: "text-cyan-600",
    bg: "bg-cyan-50",
    endpoints: [
      { method: "GET", path: "/api/auditlogs", desc: "ดึงประวัติการเปลี่ยนแปลงข้อมูล (Audit Logs) ทั้งหมดในระบบ" },
      { method: "GET", path: "/api/auditlogs/{itemCode}", desc: "ดึงประวัติการเปลี่ยนแปลงข้อมูลเฉพาะรหัสอุปกรณ์" }
    ]
  }
];

// Helper สำหรับสีของ Method Badge
const getMethodStyle = (method) => {
  switch (method.toUpperCase()) {
    case 'GET': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'POST': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'PUT': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'PATCH': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    case 'DELETE': return 'bg-red-100 text-red-700 border-red-200';
    default: return 'bg-zinc-100 text-zinc-700 border-zinc-200';
  }
};

export default function ApiDocs() {
  const [copiedPath, setCopiedPath] = useState(null);

  const handleCopy = (path) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto pb-20 px-4 md:px-8 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* --- HEADER --- */}
      <div className="pt-8 pb-6 border-b border-zinc-200/60 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-zinc-900 text-white rounded-xl flex items-center justify-center shadow-sm">
              <Terminal size={20} />
            </div>
            <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">API Documentation</h1>
          </div>
          <p className="text-zinc-500 text-sm max-w-xl leading-relaxed mt-3">
            คู่มือสำหรับนักพัฒนาเพื่อเชื่อมต่อกับระบบ IT-KLANG Backend (ASP.NET Core Web API 9.0) 
            โปรดแนบ <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-700 font-mono text-[11px]">Authorization: Bearer {'<Token>'}</code> ใน Header สำหรับ Endpoint ที่ต้องยืนยันตัวตน
          </p>
        </div>

        <div className="flex items-center gap-3 text-sm text-zinc-600 bg-white border border-zinc-200 px-4 py-2.5 rounded-xl shadow-sm">
          <Server size={16} className="text-emerald-500" />
          <span className="font-medium">Base URL:</span>
          <code className="font-mono text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded">/api</code>
        </div>
      </div>

      {/* --- API SECTIONS --- */}
      <div className="space-y-8">
        {apiSections.map((section, idx) => {
          const Icon = section.icon;
          return (
            <div key={idx} className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden">
              
              {/* Section Header */}
              <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-3">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", section.bg, section.color)}>
                  <Icon size={16} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-900">{section.title}</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">{section.description}</p>
                </div>
              </div>

              {/* Endpoint List */}
              <div className="divide-y divide-zinc-100">
                {section.endpoints.map((endpoint, eIdx) => (
                  <div key={eIdx} className="p-4 sm:px-6 flex flex-col lg:flex-row lg:items-center gap-4 hover:bg-zinc-50/50 transition-colors group">
                    
                    {/* Method & Path */}
                    <div className="flex items-center gap-3 lg:w-[40%] shrink-0">
                      <span className={cn(
                        "w-16 text-center text-[10px] font-extrabold uppercase tracking-widest py-1.5 rounded-md border",
                        getMethodStyle(endpoint.method)
                      )}>
                        {endpoint.method}
                      </span>
                      
                      <div 
                        onClick={() => handleCopy(endpoint.path)}
                        className="group/copy flex items-center gap-2 cursor-pointer relative"
                        title="คลิกเพื่อคัดลอก Endpoint"
                      >
                        <code className="font-mono text-sm text-zinc-800 font-medium tracking-tight">
                          {endpoint.path}
                        </code>
                        <button className="text-zinc-300 group-hover/copy:text-zinc-600 transition-colors">
                          {copiedPath === endpoint.path ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="flex-1 flex items-start gap-2 text-sm text-zinc-600 pl-16 lg:pl-0">
                      <Code2 size={14} className="text-zinc-300 mt-0.5 shrink-0 hidden lg:block" />
                      <p className="leading-relaxed text-[13px]">{endpoint.desc}</p>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}