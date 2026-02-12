using System.Net;
using System.Net.Mail;

namespace StockApi.Services
{
    public class GmailService : IEmailService
    {
        private readonly IConfiguration _configuration;

        public GmailService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task SendPasswordEmailAsync(string toEmail, string name, string staffId, string password)
        {
            // 1. ดึงค่า Config
            var emailSettings = _configuration.GetSection("EmailSettings");
            var fromEmail = emailSettings["Email"];
            var appPassword = emailSettings["Password"];
            var host = emailSettings["Host"];
            var port = int.Parse(emailSettings["Port"]!);

            // 2. ตั้งค่า SMTP Client
            var client = new SmtpClient(host, port)
            {
                EnableSsl = true, // Gmail ต้องเปิด SSL
                Credentials = new NetworkCredential(fromEmail, appPassword)
            };

            // 3. สร้างเนื้อหาอีเมล (HTML)
            var mailMessage = new MailMessage
            {
                From = new MailAddress(fromEmail!),
                Subject = "ยินดีต้อนรับสู่ระบบ Stock API - รหัสผ่านของคุณ",
                Body = $@"
                    <html>
                    <body>
                        <h2>ยินดีต้อนรับคุณ {name}</h2>
                        <p>บัญชีของคุณถูกสร้างเรียบร้อยแล้ว</p>
                        <p>ชื่อผู้ใช้ของคุณคือ: <b style='color:blue; font-size: 18px;'>{staffId}</b></p>
                        <p>รหัสผ่านเริ่มต้นของคุณคือ: <b style='color:blue; font-size: 18px;'>{password}</b></p>
                        <br>
                        <p style='color:red;'>*กรุณาเปลี่ยนรหัสผ่านทันทีหลังจากเข้าสู่ระบบครั้งแรก</p>
                    </body>
                    </html>
                ",
                IsBodyHtml = true // บอกว่าเป็น HTML
            };

            mailMessage.To.Add(toEmail);

            // 4. ส่งจริง
            await client.SendMailAsync(mailMessage);
        }
    }
}