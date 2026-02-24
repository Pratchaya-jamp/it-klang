using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace StockApi.Hubs
{
    [Authorize] // บังคับให้ต้อง Login ถึงจะต่อ Socket ได้
    public class NotificationHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            // ดึงข้อมูลคนล็อกอินจาก Token
            var staffId = Context.User?.Claims.FirstOrDefault(c => c.Type == "id")?.Value;
            var role = Context.User?.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role)?.Value;

            if (!string.IsNullOrEmpty(staffId))
            {
                // เอา User เข้ากลุ่มส่วนตัว (เช่น "User_EMP001")
                await Groups.AddToGroupAsync(Context.ConnectionId, $"User_{staffId}");
            }

            // ถ้าเป็น Admin ให้เข้ากลุ่ม AdminGroup ด้วย (เพื่อรับแจ้งเตือนส่วนรวม)
            if (role == "SuperAdmin" || role == "Admin")
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, "AdminGroup");
            }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            await base.OnDisconnectedAsync(exception);
        }
    }
}