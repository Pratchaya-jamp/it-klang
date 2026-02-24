using Microsoft.AspNetCore.SignalR;
using StockApi.Dtos;
using StockApi.Entities;
using StockApi.Hubs;
using StockApi.Repositories;

namespace StockApi.Services
{
    public interface INotificationService
    {
        Task SendNotificationAsync(string? targetStaffId, string title, string message, string type);
        Task<List<NotificationResponseDto>> GetMyUnreadAsync(string staffId);
        Task<List<NotificationResponseDto>> GetAllMyNotificationsAsync(string staffId);
        Task MarkAsReadAsync(int id, string staffId);
        Task MarkAllAsReadAsync(string staffId);
    }

    public class NotificationService : INotificationService
    {
        private readonly INotificationRepository _notiRepo;
        private readonly IHubContext<NotificationHub> _hubContext;

        public NotificationService(INotificationRepository notiRepo, IHubContext<NotificationHub> hubContext)
        {
            _notiRepo = notiRepo;
            _hubContext = hubContext;
        }

        public async Task SendNotificationAsync(string? targetStaffId, string title, string message, string type)
        {
            var bangkokNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time"));

            var noti = new Notification
            {
                TargetStaffId = targetStaffId,
                Title = title,
                Message = message,
                Type = type,
                CreatedAt = bangkokNow
            };

            await _notiRepo.AddAsync(noti);

            var dto = new NotificationResponseDto
            {
                Id = noti.Id,
                TargetStaffId = noti.TargetStaffId,
                Title = noti.Title,
                Message = noti.Message,
                Type = noti.Type,
                IsRead = false, // เพิ่งสร้างใหม่ ยังไงก็เป็น false
                CreatedAt = noti.CreatedAt
            };

            if (string.IsNullOrEmpty(targetStaffId))
                await _hubContext.Clients.All.SendAsync("ReceiveNotification", dto);
            else
                await _hubContext.Clients.Group($"User_{targetStaffId}").SendAsync("ReceiveNotification", dto);
        }

        public async Task<List<NotificationResponseDto>> GetMyUnreadAsync(string staffId)
        {
            var notis = await _notiRepo.GetUnreadAsync(staffId);
            return notis.Select(n => new NotificationResponseDto
            {
                Id = n.Id,
                TargetStaffId = n.TargetStaffId,
                Title = n.Title,
                Message = n.Message,
                Type = n.Type,
                IsRead = false, // ถ้าดึงมาจาก GetUnread แปลว่า IsRead = false แน่นอน
                CreatedAt = n.CreatedAt
            }).ToList();
        }

        public async Task<List<NotificationResponseDto>> GetAllMyNotificationsAsync(string staffId)
        {
            var notis = await _notiRepo.GetAllMyNotificationsAsync(staffId);
            var readIds = await _notiRepo.GetReadNotificationIdsAsync(staffId); // ดึง ID ที่อ่านแล้วมาเช็ค

            return notis.Select(n => new NotificationResponseDto
            {
                Id = n.Id,
                TargetStaffId = n.TargetStaffId,
                Title = n.Title,
                Message = n.Message,
                Type = n.Type,
                IsRead = readIds.Contains(n.Id), // ✅ เช็คว่า ID นี้อยู่ในลิสต์ที่อ่านแล้วไหม
                CreatedAt = n.CreatedAt
            }).ToList();
        }

        public async Task MarkAsReadAsync(int id, string staffId) => await _notiRepo.MarkAsReadAsync(id, staffId);

        public async Task MarkAllAsReadAsync(string staffId) => await _notiRepo.MarkAllAsReadAsync(staffId);
    }
}