using StockApi.Entities;
using StockApi.Config;

namespace StockApi.Services
{
    public interface IUserAuditService
    {
        Task LogLoginAsync(string staffId, bool isSuccess, string note = "");
    }

    public class UserAuditService : IUserAuditService
    {
        private readonly AppDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public UserAuditService(AppDbContext context, IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task LogLoginAsync(string staffId, bool isSuccess, string note = "")
        {
            // 1. ดึง IP Address มาก่อน
            var remoteIp = _httpContextAccessor.HttpContext?.Connection.RemoteIpAddress;
            string ip = "Unknown";

            if (remoteIp != null)
            {
                // 🔥 แปลง IPv6 (::1) ให้เป็น IPv4 (127.0.0.1)
                if (remoteIp.AddressFamily == System.Net.Sockets.AddressFamily.InterNetworkV6)
                {
                    remoteIp = remoteIp.MapToIPv4();
                }
                ip = remoteIp.ToString();
            }

            // 2. ดึง User-Agent
            var userAgent = _httpContextAccessor.HttpContext?.Request.Headers["User-Agent"].ToString() ?? "Unknown";

            var log = new UserAuditLog
            {
                StaffId = staffId,
                Action = isSuccess ? "Login Success" : "Login Failed",
                IsSuccess = isSuccess,
                Note = note,
                IpAddress = ip, // จะได้ค่า 127.0.0.1 แทน ::1 แล้ว
                UserAgent = userAgent.Length > 200 ? userAgent.Substring(0, 200) : userAgent,
                CreatedAt = DateTime.UtcNow
            };

            // ... (บันทึกลง DB เหมือนเดิม) ...
            _context.UserAuditLogs.Add(log);
            await _context.SaveChangesAsync();
        }
    }
}