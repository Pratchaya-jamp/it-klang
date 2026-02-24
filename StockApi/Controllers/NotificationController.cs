using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockApi.Services;

namespace StockApi.Controllers
{
    [Route("api/notifications")]
    [ApiController]
    [Authorize]
    public class NotificationController : ControllerBase
    {
        private readonly INotificationService _notiService;

        public NotificationController(INotificationService notiService)
        {
            _notiService = notiService;
        }

        [HttpGet("unread")]
        public async Task<IActionResult> GetUnread()
        {
            var staffId = User.Claims.FirstOrDefault(c => c.Type == "id")?.Value ?? "";
            var notis = await _notiService.GetMyUnreadAsync(staffId);
            return Ok(new { data = notis, count = notis.Count });
        }

        [HttpGet("history")]
        public async Task<IActionResult> GetHistory()
        {
            var staffId = User.Claims.FirstOrDefault(c => c.Type == "id")?.Value ?? "";
            var notis = await _notiService.GetAllMyNotificationsAsync(staffId);
            return Ok(new { data = notis, count = notis.Count });
        }

        [HttpPut("read/{id}")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var staffId = User.Claims.FirstOrDefault(c => c.Type == "id")?.Value ?? "";
            await _notiService.MarkAsReadAsync(id, staffId); // ✅ ส่ง staffId ไปบันทึก
            return Ok(new { message = "Marked as read" });
        }

        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var staffId = User.Claims.FirstOrDefault(c => c.Type == "id")?.Value ?? "";
            await _notiService.MarkAllAsReadAsync(staffId); // ✅ ส่ง staffId ไปบันทึก
            return Ok(new { message = "All marked as read" });
        }
    }
}