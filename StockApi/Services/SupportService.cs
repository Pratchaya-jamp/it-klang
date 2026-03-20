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

        public async Task CreateTicketAsync(string staffId, CreateSupportRequest request)
        {
            // 1. ดึงข้อมูล User ที่กำลังแจ้งปัญหา
            var user = await _context.Users.FirstOrDefaultAsync(u => u.StaffId == staffId);
            if (user == null) throw new Exception("ไม่พบข้อมูลผู้ใช้งาน");

            // 2. บันทึกลง Database
            var ticket = new SupportTicket
            {
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
            return await _context.SupportTickets
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new SupportTicketResponse
                {
                    Id = t.Id,
                    StaffId = t.StaffId,
                    Name = t.Name,
                    Email = t.Email,
                    Note = t.Note,
                    Status = t.Status,
                    CreatedAt = t.CreatedAt.ToString("dd/MM/yyyy HH:mm:ss")
                }).ToListAsync();
        }
    }
}