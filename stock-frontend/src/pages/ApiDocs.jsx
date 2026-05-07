import { useState } from 'react';
import { 
  Terminal, ShieldCheck, Package, ArrowRightLeft, LifeBuoy, 
  Copy, Check, Code2, Server 
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility Function
function cn(...inputs) { return twMerge(clsx(inputs)); }

// --- ข้อมูล API ENDPOINTS ---
const apiSections = [
  {
    title: "Authentication & Users",
    description: "ระบบยืนยันตัวตน, จัดการสิทธิ์ และ Audit Logs",
    icon: ShieldCheck,
    color: "text-purple-600",
    bg: "bg-purple-50",
    endpoints: [
      { method: "POST", path: "/api/auth/login", desc: "เข้าสู่ระบบเพื่อรับ JWT Token" },
      { method: "GET", path: "/api/auth/me", desc: "ดึงข้อมูลผู้ใช้งานปัจจุบัน" },
      { method: "GET", path: "/api/auth/admin/users", desc: "ดึงข้อมูลผู้ใช้งานทั้งหมด (สำหรับ Admin)" },
      { method: "PUT", path: "/api/auth/admin/users/{staffId}", desc: "อัปเดตข้อมูลและสิทธิ์ผู้ใช้งาน" },
      { method: "POST", path: "/api/auth/admin/request-otp", desc: "ร้องขอ OTP เพื่อรีเซ็ตรหัสผ่านให้ผู้ใช้ (Admin)" },
      { method: "POST", path: "/api/auth/admin/reset-password", desc: "ยืนยัน OTP และให้ระบบสร้างรหัสผ่านใหม่ (Auto-gen)" },
      { method: "GET", path: "/api/audit/login-logs", desc: "ดึงประวัติการเข้าสู่ระบบ (กรองด้วย Staff ID ได้)" }
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
      { method: "POST", path: "/api/items", desc: "เพิ่มอุปกรณ์ใหม่ (รองรับ Auto-gen รหัส)" },
      { method: "PUT", path: "/api/items/{code}", desc: "แก้ไขข้อมูลอุปกรณ์" },
      { method: "DELETE", path: "/api/items/{code}", desc: "ลบอุปกรณ์ออกจากระบบ" },
      { method: "GET", path: "/api/stocks/overview", desc: "ดึงข้อมูลรายการอุปกรณ์ทั้งหมดสำหรับการเลือกทำรายการ" }
    ]
  },
  {
    title: "Transactions",
    description: "ระบบเบิก, รับเข้า และตัดจำหน่าย (Write-off)",
    icon: ArrowRightLeft,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    endpoints: [
      { method: "GET", path: "/api/transactions/pending", desc: "ดึงรายการค้างจ่าย (Pending) ทั้งหมด" },
      { method: "POST", path: "/api/transactions/withdraw", desc: "ทำรายการเบิกจ่ายอุปกรณ์ออกไปใช้งาน" },
      { method: "POST", path: "/api/transactions/receive", desc: "ทำรายการรับอุปกรณ์ค้างจ่ายกลับเข้าสต็อก" },
      { method: "POST", path: "/api/transactions/write-off", desc: "ทำรายการตัดจำหน่ายอุปกรณ์ทิ้ง (บังคับกรอก Note)" },
      { method: "GET", path: "/api/transactions/write-off/summary", desc: "ดึงประวัติและยอดรวมของการตัดจำหน่ายทั้งหมด" }
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
      { method: "POST", path: "/api/borrow/request", desc: "สร้างคำขอยืมอุปกรณ์ใหม่ (ระบุ Due Date)" },
      { method: "POST", path: "/api/borrow/return/{id}", desc: "ทำรายการคืนอุปกรณ์" }
    ]
  },
  {
    title: "Support Tickets",
    description: "ระบบแจ้งปัญหา (Helpdesk) และการประเมิน",
    icon: LifeBuoy,
    color: "text-amber-600",
    bg: "bg-amber-50",
    endpoints: [
      { method: "GET", path: "/api/support/my-tickets", desc: "ดึงรายการ Ticket ของผู้ใช้งานปัจจุบัน" },
      { method: "GET", path: "/api/support/tickets", desc: "ดึงรายการ Ticket ทั้งหมดในระบบ (Admin)" },
      { method: "POST", path: "/api/support/ticket", desc: "สร้างรายการแจ้งปัญหาใหม่" },
      { method: "PUT", path: "/api/support/ticket/{ticketNo}/reply", desc: "ตอบกลับการแจ้งปัญหา (Admin)" },
      { method: "POST", path: "/api/support/ticket/{ticketNo}/rate", desc: "ผู้ใช้งานให้คะแนนประเมินการแก้ปัญหา (1-5 ดาว)" }
    ]
  }
];

// Helper สำหรับสีของ Method Badge
const getMethodStyle = (method) => {
  switch (method.toUpperCase()) {
    case 'GET': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'POST': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'PUT': return 'bg-orange-100 text-orange-700 border-orange-200';
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
                    <div className="flex items-center gap-3 lg:w-5/12 shrink-0">
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
                      <p className="leading-relaxed">{endpoint.desc}</p>
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