import { 
  Info, Package, ArrowRightLeft, LifeBuoy, ShieldCheck, 
  Code2, Database, Server, Cpu, GraduationCap, Building2, UserCircle 
} from 'lucide-react';

export default function About() {
  return (
    <div className="max-w-4xl mx-auto pb-20 px-4 md:px-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col items-center text-center pt-10 pb-6 border-b border-zinc-200/60">
        <div className="w-16 h-16 bg-zinc-900 text-white rounded-2xl flex items-center justify-center font-bold text-2xl shadow-xl shadow-zinc-200 mb-6">
          IT
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-3">IT-KLANG</h1>
        <p className="text-zinc-500 text-sm max-w-lg leading-relaxed">
          ระบบบริหารจัดการคลังอุปกรณ์ไอทีส่วนกลาง (IT Operations Center) 
          ออกแบบมาเพื่อยกระดับประสิทธิภาพในการเบิก-จ่าย ยืม-คืน และการสนับสนุนทางเทคนิค
        </p>
      </div>

      {/* Features Section */}
      <div className="space-y-4 pt-4">
        <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
          <Info size={20} className="text-zinc-400" />
          ความสามารถหลักของระบบ
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/60 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
              <Package size={20} />
            </div>
            <h3 className="font-semibold text-zinc-900 mb-1.5">Inventory Management</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">
              จัดการรายการอุปกรณ์ เพิ่ม แก้ไข ลบ และติดตามจำนวนคงเหลือแบบเรียลไทม์ พร้อมระบบสถานะ DRAFT 
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-zinc-200/60 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
              <ArrowRightLeft size={20} />
            </div>
            <h3 className="font-semibold text-zinc-900 mb-1.5">Transactions & Borrowing</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">
              ระบบทำรายการเบิกจ่าย รับเข้า ตัดจำหน่าย (Write-off) และระบบยืม-คืนพร้อมการแจ้งเตือนผ่านอีเมล
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-zinc-200/60 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
              <LifeBuoy size={20} />
            </div>
            <h3 className="font-semibold text-zinc-900 mb-1.5">Support Tickets</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">
              ระบบแจ้งปัญหาและร้องขอความช่วยเหลือ (Helpdesk) พร้อมให้คะแนนความพึงพอใจหลังได้รับการแก้ไข
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-zinc-200/60 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
              <ShieldCheck size={20} />
            </div>
            <h3 className="font-semibold text-zinc-900 mb-1.5">Security & Auditing</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">
              ระบบจัดการสิทธิ์ผู้ใช้งาน (Role-based) ตรวจสอบประวัติการเข้าสู่ระบบ และการยืนยันตัวตนขั้นสูงด้วย OTP
            </p>
          </div>
        </div>
      </div>

      {/* Tech Stack Section */}
      <div className="space-y-4 pt-6">
        <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
          <Code2 size={20} className="text-zinc-400" />
          เทคโนโลยีที่ใช้งาน (Tech Stack)
        </h2>
        <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <LifeBuoy size={16} className="text-sky-500" /> Frontend
              </div>
              <ul className="text-sm text-zinc-600 space-y-2">
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-zinc-300"/> React (Vite)</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-zinc-300"/> Tailwind CSS v4</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-zinc-300"/> Lucide React</li>
              </ul>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <Server size={16} className="text-purple-500" /> Backend
              </div>
              <ul className="text-sm text-zinc-600 space-y-2">
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-zinc-300"/> .NET 9 (C#)</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-zinc-300"/> ASP.NET Core Web API</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-zinc-300"/> EF Core</li>
              </ul>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <Database size={16} className="text-emerald-500" /> Database & Infra
              </div>
              <ul className="text-sm text-zinc-600 space-y-2">
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-zinc-300"/> MySQL</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-zinc-300"/> Docker / Docker Compose</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-zinc-300"/> Tailscale Funnel</li>
              </ul>
            </div>

          </div>
        </div>
      </div>

      {/* Project Info Section */}
      <div className="space-y-4 pt-6">
        <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
          <GraduationCap size={20} className="text-zinc-400" />
          ข้อมูลโครงงาน
        </h2>
        <div className="bg-zinc-900 text-zinc-300 rounded-2xl p-6 md:p-8 relative overflow-hidden">
          {/* Decorative element */}
          <div className="absolute -top-12 -right-12 text-zinc-800 opacity-50">
            <Cpu size={120} strokeWidth={1} />
          </div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">สถาบันการศึกษา</p>
                <p className="text-sm font-medium text-white flex items-center gap-2">
                  <GraduationCap size={16} />
                  คณะเทคโนโลยีสารสนเทศ (SIT) มจธ. (KMUTT)
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">สถานที่ปฏิบัติงาน</p>
                <p className="text-sm font-medium text-white flex items-center gap-2">
                  <Building2 size={16} />
                  บริษัท คอสโม กรุ๊ป จำกัด
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">ผู้จัดทำโครงงาน</p>
                <p className="text-sm font-medium text-white flex items-center gap-2">
                  <UserCircle size={16} />
                  นายปรัชญา จำปาเทศ
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">อาจารย์ที่ปรึกษา / พี่เลี้ยง</p>
                <p className="text-sm font-medium text-white">
                  อาจารย์: อ.อัจฉรา ธารอุไรกุล<br />
                  พี่เลี้ยงผู้ดูแล: นายนพดล รอดยอดสร้อย
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}