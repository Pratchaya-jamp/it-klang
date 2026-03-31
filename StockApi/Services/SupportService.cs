using Microsoft.EntityFrameworkCore;
using StockApi.Config;
using StockApi.Dtos;
using StockApi.Entities;

namespace StockApi.Services
{
    public interface ISupportService
    {
        Task CreateTicketAsync(string staffId, CreateSupportRequest request);
        Task<List<SupportTicketResponse>> GetAllTicketsAsync();
        Task<List<SupportTicketResponse>> GetMyTicketsAsync(string staffId);
        Task ReplyTicketAsync(string ticketNo, string supporterStaffId, string supporterName, ReplySupportRequest request);
    }

    public class SupportService : ISupportService
    {
        private readonly AppDbContext _context;
        private readonly IEmailService _emailService;
        private readonly INotificationService _notiService;

        public SupportService(AppDbContext context, IEmailService emailService, INotificationService notiService)
        {
            _context = context;
            _emailService = emailService;
            _notiService = notiService;
        }

        private string GenerateTicketNo()
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            var random = new Random();
            // สุ่ม 8 ตัวอักษร เช่น 9A4X7B21
            var randomString = new string(Enumerable.Repeat(chars, 8)
                .Select(s => s[random.Next(s.Length)]).ToArray());

            return $"TK-{randomString}"; // ผลลัพธ์: TK-9A4X7B21
        }

        public async Task CreateTicketAsync(string staffId, CreateSupportRequest request)
        {
            // 1. ดึงข้อมูล User ที่กำลังแจ้งปัญหา
            var user = await _context.Users.FirstOrDefaultAsync(u => u.StaffId == staffId);
            if (user == null) throw new Exception("ไม่พบข้อมูลผู้ใช้งาน");

            // 2. บันทึกลง Database
            var ticket = new SupportTicket
            {
                TicketNo = GenerateTicketNo(),
                StaffId = user.StaffId,
                Name = user.Name,
                Email = user.Email,
                Note = request.Note,
                Status = "Pending",
                CreatedAt = DateTime.Now
            };
            _context.SupportTickets.Add(ticket);
            await _context.SaveChangesAsync();

            // 3. ดึงรายชื่อ WebSupporter ทั้งหมดในระบบ
            var supporters = await _context.Users.Where(u => u.Role == "WebSupporter").ToListAsync();

            // 4. วนลูปส่ง Email และ Noti ให้ Supporter ทุกคน
            foreach (var sup in supporters)
            {
                // 📩 ส่งอีเมล
                string subject = "🔴 แจ้งปัญหาการใช้งานระบบ (Support Ticket)";
                string body = $@"
                    <h3>มีการแจ้งปัญหาการใช้งานใหม่</h3>
                    <p><b>ผู้แจ้ง:</b> {user.Name} ({user.StaffId})</p>
                    <p><b>อีเมลติดต่อกลับ:</b> {user.Email}</p>
                    <p><b>รายละเอียดปัญหา:</b></p>
                    <div style='background-color:#f8d7da; padding:10px; border-radius:5px;'>{request.Note}</div>
                    <p>กรุณาตรวจสอบในระบบ</p>
                ";
                await _emailService.SendEmailAsync(sup.Email, subject, body);

                // 🔔 ส่ง Notification (เด้งเฉพาะเครื่องของ Supporter)
                await _notiService.SendNotificationAsync(
                    sup.StaffId,
                    "แจ้งปัญหาการใช้งานระบบ",
                    $"คุณ {user.Name} แจ้งปัญหาเข้ามาว่า: {request.Note}",
                    "SUPPORT"
                );
            }
        }

        public async Task<List<SupportTicketResponse>> GetAllTicketsAsync()
        {
            // ดึง Ticket ทั้งหมด และเรียงจากล่าสุดไปเก่าสุด
            return await _context.SupportTickets
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new SupportTicketResponse
                {
                    TicketNo = t.TicketNo,
                    StaffId = t.StaffId,
                    Name = t.Name,
                    Email = t.Email,
                    Note = t.Note,
                    Status = t.Status,
                    CreatedAt = t.CreatedAt.ToString("dd/MM/yyyy HH:mm:ss"),
                    // ✅ แมปฟิลด์การตอบกลับให้โชว์ในฝั่ง Supporter ด้วย
                    ReplyMessage = t.ReplyMessage,
                    RepliedBy = t.RepliedBy,
                    RepliedAt = t.RepliedAt.HasValue ? t.RepliedAt.Value.ToString("dd/MM/yyyy HH:mm:ss") : null
                }).ToListAsync();
        }

        public async Task<List<SupportTicketResponse>> GetMyTicketsAsync(string staffId)
        {
            return await _context.SupportTickets
                .Where(t => t.StaffId == staffId)
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new SupportTicketResponse
                {
                    TicketNo = t.TicketNo,
                    StaffId = t.StaffId,
                    Name = t.Name,
                    Email = t.Email,
                    Note = t.Note,
                    Status = t.Status,
                    CreatedAt = t.CreatedAt.ToString("dd/MM/yyyy HH:mm:ss"),
                    ReplyMessage = t.ReplyMessage,
                    RepliedBy = t.RepliedBy,
                    RepliedAt = t.RepliedAt.HasValue ? t.RepliedAt.Value.ToString("dd/MM/yyyy HH:mm:ss") : null
                }).ToListAsync();
        }

        public async Task ReplyTicketAsync(string ticketNo, string supporterStaffId, string supporterName, ReplySupportRequest request)
        {
            var ticket = await _context.SupportTickets.FirstOrDefaultAsync(t => t.TicketNo == ticketNo);
            if (ticket == null) throw new Exception("ไม่พบข้อมูล Ticket นี้");
            if (ticket.Status == "Resolved") throw new Exception("Ticket นี้ได้รับการแก้ไขไปแล้ว");

            // อัปเดตข้อมูล Ticket
            ticket.Status = "Resolved"; // เปลี่ยนสถานะเป็นสำเร็จ
            ticket.ReplyMessage = request.ReplyMessage;
            ticket.RepliedBy = supporterName;
            ticket.RepliedAt = DateTime.Now;

            _context.SupportTickets.Update(ticket);
            await _context.SaveChangesAsync();

            // 📩 ส่งอีเมลแจ้ง User ว่าปัญหาได้รับการแก้ไขและตอบกลับแล้ว
            string subject = $"✅ อัปเดตสถานะการแจ้งปัญหา Ticket #{ticket.TicketNo}";
            string body = $@"
                <div style='font-family: sans-serif;'>
                    <h3>สวัสดีคุณ {ticket.Name}</h3>
                    <p>ปัญหาที่คุณได้แจ้งเข้ามา (Ticket #{ticket.TicketNo}) ได้รับการตรวจสอบและตอบกลับจากทีมงานแล้ว</p>
                    <hr/>
                    <p><b>ปัญหาที่แจ้ง:</b> {ticket.Note}</p>
                    <p><b>การตอบกลับจากทีมงาน:</b></p>
                    <div style='background-color:#d4edda; color:#155724; padding:15px; border-radius:5px;'>
                        {request.ReplyMessage}
                    </div>
                    <p style='color:#6c757d; font-size:12px; margin-top:20px;'>
                        ตอบกลับโดย: {supporterName} เมื่อ {ticket.RepliedAt.Value.ToString("dd/MM/yyyy HH:mm:ss")}
                    </p>
                </div>
            ";
            await _emailService.SendEmailAsync(ticket.Email, subject, body);

            // 🔔 ส่ง Noti ไปที่กระดิ่งหน้าเว็บของ User
            await _notiService.SendNotificationAsync(
                ticket.StaffId,
                "ปัญหาของคุณได้รับการแก้ไขแล้ว",
                $"ทีมงานได้ตอบกลับ Ticket #{ticket.Id} ของคุณแล้ว: {request.ReplyMessage}",
                "SUPPORT_RESOLVED"
            );
        }
    }
}