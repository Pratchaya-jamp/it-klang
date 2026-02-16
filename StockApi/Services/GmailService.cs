using System.Net;
using System.Net.Mail;
using DotNetEnv;

namespace StockApi.Services
{
    public class GmailService : IEmailService
    {
        private readonly IConfiguration _configuration;

        public GmailService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task SendEmailAsync(string to, string subject, string body)
        {
            // ดึงค่า Config (ตรวจสอบว่าใน appsettings.json หรือ .env มีค่าเหล่านี้ไหม)
            // ถ้าใช้ .env ผ่าน IConfiguration: keys มักจะเป็น "EmailSettings:Email"
            var fromEmail = Environment.GetEnvironmentVariable("EMAIL_USER");

            var appPassword = Environment.GetEnvironmentVariable("EMAIL_PASS");

            var host = Environment.GetEnvironmentVariable("EMAIL_HOST");

            var portStr = Environment.GetEnvironmentVariable("EMAIL_PORT");

            if (string.IsNullOrEmpty(fromEmail))
            {
                throw new Exception("Config Error: EMAIL_USER is missing in .env");
            }

            if (!int.TryParse(portStr, out int port)) port = 587;

            var client = new SmtpClient(host, port)
            {
                EnableSsl = true,
                Credentials = new NetworkCredential(fromEmail, appPassword)
            };

            var mailMessage = new MailMessage
            {
                From = new MailAddress(fromEmail),
                Subject = subject,
                Body = body,
                IsBodyHtml = true
            };

            mailMessage.To.Add(to);

            await client.SendMailAsync(mailMessage);
        }

        // --- 2. ฟังก์ชันเดิม (ส่งรหัสผ่านตอน Register) ---
        // ปรับให้เรียกใช้ SendEmailAsync ด้านบน (ลด code ซ้ำซ้อน)
        public async Task SendPasswordEmailAsync(string toEmail, string name, string staffId, string password)
        {
            string subject = "ยินดีต้อนรับสู่ระบบ Stock API - รหัสผ่านของคุณ";

            string body = $@"
                <html>
                <body>
                    <h2>ยินดีต้อนรับคุณ {name}</h2>
                    <p>บัญชีของคุณถูกสร้างเรียบร้อยแล้ว</p>
                    <p>ชื่อผู้ใช้ของคุณคือ: <b style='color:blue; font-size: 18px;'>{staffId}</b></p>
                    <p>รหัสผ่านเริ่มต้นของคุณคือ: <b style='color:blue; font-size: 18px;'>{password}</b></p>
                    <br>
                    <p style='color:red;'>*กรุณาเปลี่ยนรหัสผ่านทันทีหลังจากเข้าสู่ระบบครั้งแรก</p>
                </body>
                </html>";

            // เรียกใช้ฟังก์ชันหลักด้านบน
            await SendEmailAsync(toEmail, subject, body);
        }
    }
}