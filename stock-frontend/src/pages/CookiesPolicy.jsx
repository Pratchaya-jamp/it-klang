import { 
  Cookie, ShieldAlert, Settings, 
  Info, CheckCircle2, AlertTriangle 
} from 'lucide-react';

export default function CookiesPolicy() {
  const lastUpdated = "22 เมษายน 2026";

  return (
    <div className="max-w-4xl mx-auto pb-20 px-4 md:px-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* --- HEADER --- */}
      <div className="pt-10 pb-6 border-b border-zinc-200/60 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="w-12 h-12 bg-zinc-900 text-white rounded-2xl flex items-center justify-center shadow-md mb-4">
            <Cookie size={24} />
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">นโยบายคุกกี้</h1>
          <p className="text-zinc-500 text-sm mt-2">Cookies Policy สำหรับระบบ IT-KLANG Operations</p>
        </div>
        <div className="text-xs font-medium text-zinc-500 bg-zinc-100 px-3 py-1.5 rounded-lg border border-zinc-200/60 w-fit">
          อัปเดตล่าสุด: {lastUpdated}
        </div>
      </div>

      {/* --- CONTENT --- */}
      <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6 md:p-8 space-y-10">
        
        {/* Intro */}
        <p className="text-sm text-zinc-600 leading-relaxed">
          ระบบ <span className="font-semibold text-zinc-900">IT-KLANG</span> มีการใช้งานคุกกี้ (Cookies) และเทคโนโลยีการจัดเก็บข้อมูลบนเบราว์เซอร์ (เช่น Local Storage / Session Storage) เพื่อให้ระบบสามารถทำงานได้อย่างถูกต้อง ปลอดภัย และช่วยให้เราสามารถจดจำสถานะการเข้าสู่ระบบของคุณได้
        </p>

        <div className="space-y-8">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <Info size={20} className="text-blue-500" />
              1. คุกกี้ (Cookies) คืออะไร?
            </h2>
            <p className="text-sm text-zinc-600 leading-relaxed pl-7">
              คุกกี้ คือไฟล์ข้อความขนาดเล็กที่ถูกดาวน์โหลดและจัดเก็บไว้ในคอมพิวเตอร์หรืออุปกรณ์มือถือของคุณเมื่อคุณเข้าใช้งานเว็บไซต์ คุกกี้ช่วยให้เว็บไซต์สามารถจดจำอุปกรณ์และการตั้งค่าของคุณได้ เพื่อความสะดวกในการใช้งานครั้งต่อไป
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <ShieldAlert size={20} className="text-emerald-500" />
              2. ประเภทคุกกี้ที่ระบบของเราใช้งาน
            </h2>
            <p className="text-sm text-zinc-600 leading-relaxed pl-7">
              เนื่องจาก IT-KLANG เป็นระบบสำหรับใช้งานภายในองค์กร เราจึงใช้งานเฉพาะคุกกี้ที่จำเป็นต่อการทำงานของระบบเท่านั้น <strong className="text-zinc-800">ไม่มีการใช้คุกกี้เพื่อการโฆษณาหรือติดตามพฤติกรรมข้ามเว็บไซต์ (Third-party Tracking Cookies)</strong>
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7 pt-2">
              <div className="p-4 bg-zinc-50 border border-zinc-200/60 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <h3 className="font-semibold text-zinc-900 text-sm">คุกกี้ที่จำเป็นอย่างยิ่ง (Strictly Necessary)</h3>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  เป็นคุกกี้ที่ขาดไม่ได้เพื่อให้ระบบทำงานได้ เช่น การเก็บ Session, การเข้ารหัส JWT Token เพื่อยืนยันตัวตน และการรักษาความปลอดภัยของบัญชีผู้ใช้ หากไม่มีคุกกี้เหล่านี้ คุณจะไม่สามารถเข้าสู่ระบบหรือใช้งานฟีเจอร์ใดๆ ได้
                </p>
              </div>

              <div className="p-4 bg-zinc-50 border border-zinc-200/60 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Settings size={16} className="text-blue-500" />
                  <h3 className="font-semibold text-zinc-900 text-sm">คุกกี้เพื่อการทำงานของระบบ (Functional)</h3>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  ใช้เพื่อจดจำการตั้งค่าของคุณภายในระบบ เช่น การย่อ/ขยายเมนู (Sidebar), การกรองข้อมูล (Filters) หรือสถานะการจัดเรียงตาราง เพื่อให้คุณไม่ต้องตั้งค่าใหม่ทุกครั้งที่เปลี่ยนหน้า
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <Settings size={20} className="text-purple-500" />
              3. การจัดการและการตั้งค่าคุกกี้
            </h2>
            <p className="text-sm text-zinc-600 leading-relaxed pl-7">
              คุณสามารถตั้งค่าเบราว์เซอร์ของคุณเพื่อปฏิเสธการเก็บคุกกี้ทั้งหมด หรือแจ้งเตือนเมื่อมีการส่งคุกกี้ได้ อย่างไรก็ตาม โปรดทราบว่าส่วนประกอบบางอย่างของระบบ IT-KLANG อาจทำงานไม่ถูกต้องหรือไม่สามารถเข้าถึงได้ หากคุณปิดการใช้งานคุกกี้
            </p>
          </section>

        </div>

        {/* Warning Note */}
        <div className="mt-8 p-4 bg-amber-50 border border-amber-200/60 rounded-xl text-sm text-amber-700 flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" />
          <p className="leading-relaxed">
            <strong className="font-bold">ข้อควรระวัง:</strong> การล้างคุกกี้ (Clear Cookies) หรือข้อมูลเว็บไซต์ในเบราว์เซอร์ จะทำให้คุณถูกออกจากระบบ (Log out) โดยอัตโนมัติ และระบบจะรีเซ็ตการตั้งค่า UI ต่างๆ กลับเป็นค่าเริ่มต้น
          </p>
        </div>

      </div>
    </div>
  );
}
