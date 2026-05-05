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
            var httpContext = _httpContextAccessor.HttpContext;
            string ip = "Unknown";

            if (httpContext != null)
            {
                // 1. ลองดึงจาก Header X-Forwarded-For ก่อน (สำคัญมากกรณีผ่าน Proxy หรือ Cloudflare)
                var forwardedFor = httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
                
                if (!string.IsNullOrWhiteSpace(forwardedFor))
                {
                    // กรณีมีหลาย IP ต่อกันด้วยลูกน้ำ (เช่น ClientIP, Proxy1, Proxy2) ให้เอาตัวแรกสุด
                    ip = forwardedFor.Split(',')[0].Trim();
                }
                else
                {
                    // 2. ถ้าไม่มีผ่าน Proxy ค่อยดึงจาก Connection ตรงๆ
                    var remoteIp = httpContext.Connection.RemoteIpAddress;
                    if (remoteIp != null)
                    {
                        // 🔥 แปลง IPv6 (::1) ให้เป็น IPv4 (127.0.0.1)
                        if (remoteIp.AddressFamily == System.Net.Sockets.AddressFamily.InterNetworkV6)
                        {
                            remoteIp = remoteIp.MapToIPv4();
                        }
                        ip = remoteIp.ToString();
                    }
                }
            }

            // 3. ดึง User-Agent
            var userAgent = httpContext?.Request.Headers["User-Agent"].ToString() ?? "Unknown";

            var log = new UserAuditLog
            {
                StaffId = staffId,
                Action = isSuccess ? "Login Success" : "Login Failed",
                IsSuccess = isSuccess,
                Note = note,
                IpAddress = ip, // ได้ IP จริง (IPv4) เรียบร้อยแล้ว
                UserAgent = userAgent.Length > 200 ? userAgent.Substring(0, 200) : userAgent,
                CreatedAt = DateTime.UtcNow
            };

            _context.UserAuditLogs.Add(log);
            await _context.SaveChangesAsync();
        }
    }
}