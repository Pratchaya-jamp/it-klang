namespace StockApi.Services
{
    public interface IEmailService
    {
        Task SendPasswordEmailAsync(string toEmail, string name, string staffId, string password);
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
    }
}