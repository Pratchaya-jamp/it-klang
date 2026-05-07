import { 
  Fingerprint, Database, FileText, 
  EyeOff, ShieldCheck, UserCog 
} from 'lucide-react';

export default function PrivacyPolicy() {
  const lastUpdated = "22 เมษายน 2026";

  return (
    <div className="max-w-4xl mx-auto pb-20 px-4 md:px-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* --- HEADER --- */}
      <div className="pt-10 pb-6 border-b border-zinc-200/60 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="w-12 h-12 bg-zinc-900 text-white rounded-2xl flex items-center justify-center shadow-md mb-4">
            <Fingerprint size={24} />
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">นโยบายความเป็นส่วนตัว</h1>
          <p className="text-zinc-500 text-sm mt-2">Privacy Policy สำหรับระบบ IT-KLANG Operations</p>
        </div>
        <div className="text-xs font-medium text-zinc-500 bg-zinc-100 px-3 py-1.5 rounded-lg border border-zinc-200/60 w-fit">
          อัปเดตล่าสุด: {lastUpdated}
        </div>
      </div>

      {/* --- CONTENT --- */}
      <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6 md:p-8 space-y-10">
        
        {/* Intro */}
        <p className="text-sm text-zinc-600 leading-relaxed">
          ระบบ <span className="font-semibold text-zinc-900">IT-KLANG</span> ให้ความสำคัญกับการคุ้มครองข้อมูลส่วนบุคคลของผู้ใช้งาน (พนักงาน นักศึกษา และผู้ที่เกี่ยวข้อง) นโยบายฉบับนี้จัดทำขึ้นเพื่ออธิบายถึงวิธีการเก็บรวบรวม ใช้ และปกป้องข้อมูลของคุณเมื่อเข้าใช้งานระบบบริหารจัดการคลังอุปกรณ์ไอทีส่วนกลางของเรา
        </p>

        <div className="space-y-8">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <Database size={20} className="text-blue-500" />
              1. ข้อมูลที่เราเก็บรวบรวม
            </h2>
            <p className="text-sm text-zinc-600 leading-relaxed pl-7">
              เพื่อให้ระบบสามารถทำงานได้อย่างสมบูรณ์ เราจำเป็นต้องเก็บข้อมูลดังต่อไปนี้:
            </p>
            <ul className="list-disc list-outside pl-12 text-sm text-zinc-600 space-y-1.5 marker:text-zinc-300">
              <li><strong className="text-zinc-800">ข้อมูลบัญชีผู้ใช้:</strong> ชื่อ-นามสกุล, รหัสประจำตัว (Staff/Student ID), อีเมล และข้อมูลการติดต่อเบื้องต้น</li>
              <li><strong className="text-zinc-800">ข้อมูลประวัติการทำรายการ:</strong> ประวัติการยืม-คืนอุปกรณ์, การร้องขอเบิกจ่าย และข้อมูลรหัสงาน (Job ID) ที่เกี่ยวข้อง</li>
              <li><strong className="text-zinc-800">ข้อมูลจราจรทางคอมพิวเตอร์ (Log):</strong> ประวัติการเข้าสู่ระบบ (Login Logs), หมายเลข IP Address, และเวลาที่เข้าใช้งาน (Timestamp) สำหรับ Audit Trail</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <FileText size={20} className="text-emerald-500" />
              2. วัตถุประสงค์ในการเก็บและใช้ข้อมูล
            </h2>
            <ul className="list-disc list-outside pl-12 text-sm text-zinc-600 space-y-1.5 marker:text-zinc-300">
              <li>เพื่อใช้ยืนยันตัวตน (Authentication) และกำหนดสิทธิ์การเข้าถึงเมนูต่างๆ ภายในระบบ</li>
              <li>เพื่อติดตามสถานะทรัพย์สินขององค์กร ป้องกันการสูญหาย และระบุตัวผู้รับผิดชอบอุปกรณ์ในแต่ละช่วงเวลา</li>
              <li>เพื่อส่งอีเมลแจ้งเตือนการกำหนดคืนอุปกรณ์ และอัปเดตสถานะการแจ้งปัญหา (Support Ticket)</li>
              <li>เพื่อใช้เป็นหลักฐาน (Audit Log) ในกรณีที่เกิดข้อผิดพลาดหรือมีการตรวจสอบความโปร่งใสภายในองค์กร</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <EyeOff size={20} className="text-amber-500" />
              3. การเปิดเผยข้อมูล
            </h2>
            <p className="text-sm text-zinc-600 leading-relaxed pl-7">
              ข้อมูลของคุณจะถูกใช้งานและสามารถเข้าถึงได้โดย <strong className="text-zinc-800">ทีมผู้ดูแลระบบ (IT Admin) และผู้บริหารที่มีสิทธิ์เกี่ยวข้องเท่านั้น</strong> เราขอยืนยันว่าจะไม่มีการเปิดเผย ขาย หรือส่งต่อข้อมูลส่วนบุคคลของคุณให้กับบุคคลที่สาม หรือเอเจนซี่โฆษณาภายนอกโดยเด็ดขาด เว้นแต่จะได้รับคำสั่งตามกฎหมาย
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <ShieldCheck size={20} className="text-purple-500" />
              4. ความปลอดภัยของข้อมูล
            </h2>
            <p className="text-sm text-zinc-600 leading-relaxed pl-7">
              เรามีมาตรการรักษาความปลอดภัยของระบบอย่างเข้มงวด ได้แก่:
            </p>
            <ul className="list-disc list-outside pl-12 text-sm text-zinc-600 space-y-1.5 marker:text-zinc-300">
              <li>เข้ารหัสลับข้อมูลรหัสผ่าน (Password Hashing) ไม่มีการเก็บรหัสผ่านเป็นข้อความธรรมดา</li>
              <li>ใช้เทคโนโลยี JWT (JSON Web Token) ในการจัดการเซสชันเพื่อป้องกันการปลอมแปลง</li>
              <li>จำกัดสิทธิ์การเข้าถึงข้อมูลตามบทบาท (Role-based Access Control)</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <UserCog size={20} className="text-rose-500" />
              5. สิทธิของผู้ใช้งาน
            </h2>
            <p className="text-sm text-zinc-600 leading-relaxed pl-7">
              ผู้ใช้งานมีสิทธิ์ในการเข้าถึงข้อมูลส่วนบุคคลของตนเองผ่านเมนู "โปรไฟล์ส่วนตัว (Profile)" และสามารถร้องขอให้ผู้ดูแลระบบแก้ไขข้อมูลให้ถูกต้องและเป็นปัจจุบันได้ตลอดเวลา 
            </p>
          </section>

        </div>

        {/* Contact Note */}
        <div className="mt-8 p-4 bg-zinc-50 border border-zinc-200/60 rounded-xl text-sm text-zinc-500 flex items-start gap-3">
          <div className="mt-0.5 font-bold text-zinc-700">ติดต่อเรา:</div>
          <p className="leading-relaxed">
            หากคุณมีข้อสงสัยเกี่ยวกับนโยบายความเป็นส่วนตัวนี้ กรุณาติดต่อทีม IT Support ผ่านระบบแจ้งปัญหา (Support Tickets) ภายในระบบ หรือติดต่อเจ้าหน้าที่ผู้ดูแลระบบโดยตรง
          </p>
        </div>

      </div>
    </div>
  );
}
