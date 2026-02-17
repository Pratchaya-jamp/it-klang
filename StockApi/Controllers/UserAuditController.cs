using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockApi.Config;
using StockApi.Entities;

namespace StockApi.Controllers
{
    [Route("api/audit")]
    [ApiController]
    public class UserAuditController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UserAuditController(AppDbContext context)
        {
            _context = context;
        }

        // 1. ดูประวัติการ Login ทั้งหมด (ล่าสุด 100 รายการ)
        // GET: api/audit/login-logs
        [Authorize(Policy = "SuperAdminOnly")] // เฉพาะ SuperAdmin เท่านั้น
        [HttpGet("login-logs")]
        public async Task<IActionResult> GetLoginLogs()
        {
            var logs = await _context.UserAuditLogs
                .OrderByDescending(l => l.Id) // เรียงจากใหม่ไปเก่า
                .Take(100) // ดึงแค่ 100 รายการล่าสุด (กันโหลดหนัก)
                .Select(l => new
                {
                    l.Id,
                    l.StaffId,
                    l.Action,
                    Status = l.IsSuccess ? "Success" : "Failed",
                    l.Note,
                    l.IpAddress,
                    Device = ParseUserAgent(l.UserAgent), // แปลง UserAgent ให้ดูง่าย (Optional)
                    TimeAgo = CalculateTimeAgo(l.CreatedAt),
                    Timestamp = l.CreatedAt
                })
                .ToListAsync();

            return Ok(logs);
        }

        // 2. ดูประวัติเฉพาะเจาะจงรายบุคคล
        // GET: api/audit/login-logs/ST001
        [Authorize(Policy = "SuperAdminOnly")]
        [HttpGet("login-logs/{staffId}")]
        public async Task<IActionResult> GetUserLoginLogs(string staffId)
        {
            var logs = await _context.UserAuditLogs
                .Where(l => l.StaffId == staffId)
                .OrderByDescending(l => l.Id)
                .Take(50)
                .ToListAsync();

            return Ok(logs);
        }

        // --- Helper Function เล็กๆ ไว้แต่งข้อมูลให้ดูง่าย ---
        private static string ParseUserAgent(string? userAgent)
        {
            if (string.IsNullOrEmpty(userAgent)) return "Unknown";
            // ตัดคำสั้นๆ แค่ให้พอรู้ว่าเป็น Chrome หรือ Mobile
            if (userAgent.Contains("Postman")) return "Postman";
            if (userAgent.Contains("Chrome")) return "Google Chrome";
            if (userAgent.Contains("Firefox")) return "Firefox";
            if (userAgent.Contains("Safari") && !userAgent.Contains("Chrome")) return "Safari";
            if (userAgent.Contains("Edge")) return "Microsoft Edge";
            return "Other Browser";
        }

        private static string CalculateTimeAgo(DateTime dateTime)
        {
            var timeSpan = DateTime.UtcNow - dateTime;
            if (timeSpan.TotalMinutes < 1) return "Just now";
            if (timeSpan.TotalMinutes < 60) return $"{(int)timeSpan.TotalMinutes} mins ago";
            if (timeSpan.TotalHours < 24) return $"{(int)timeSpan.TotalHours} hours ago";
            return $"{(int)timeSpan.TotalDays} days ago";
        }
    }
}