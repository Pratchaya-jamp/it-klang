namespace StockApi.Services
{
    public interface IEmailService
    {
        Task SendPasswordEmailAsync(string toEmail, string name, string staffId, string password);
        Task SendEmailAsync(string to, string subject, string body);
    }

    public class MockEmailService : IEmailService
    {
        public Task SendPasswordEmailAsync(string toEmail, string name, string staffId, string password)
        {
            // ของจริง: ใช้ SmtpClient ส่งเมล
            // ของเล่น: ปริ้นท์ออกมาดูเลย
            Console.WriteLine("================ EMAIL SENT ================");
            Console.WriteLine($"To: {toEmail}");
            Console.WriteLine($"Subject: ยินดีต้อนรับ! รหัสผ่านของคุณ");
            Console.WriteLine($"Message: สวัสดีคุณ {staffId}, รหัสผ่านของคุณคือ: {password}");
            Console.WriteLine("============================================");
            return Task.CompletedTask;
        }

        public Task SendEmailAsync(string to, string subject, string body)
        {
            Console.WriteLine("------------------------------------------------");
            Console.WriteLine($"[Mock Email] Sending to: {to}");
            Console.WriteLine($"[Mock Email] Subject: {subject}");
            Console.WriteLine($"[Mock Email] Body: {body}"); // หรือจะย่อถ้ามันยาวเกิน
            Console.WriteLine("------------------------------------------------");
            return Task.CompletedTask;
        }
    }
}