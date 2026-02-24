using Microsoft.EntityFrameworkCore;
using StockApi.Config;
using StockApi.Entities;

namespace StockApi.Repositories
{
    public interface INotificationRepository
    {
        Task<Notification> AddAsync(Notification notification);
        Task<List<Notification>> GetUnreadAsync(string staffId);
        Task<List<Notification>> GetAllMyNotificationsAsync(string staffId);
        Task<List<int>> GetReadNotificationIdsAsync(string staffId); // ดึง ID ที่เคยอ่านแล้ว
        Task MarkAsReadAsync(int notificationId, string staffId);
        Task MarkAllAsReadAsync(string staffId);
    }

    public class NotificationRepository : INotificationRepository
    {
        private readonly AppDbContext _context;
        public NotificationRepository(AppDbContext context) { _context = context; }

        public async Task<Notification> AddAsync(Notification notification)
        {
            await _context.Notifications.AddAsync(notification);
            await _context.SaveChangesAsync();
            return notification;
        }

        public async Task<List<int>> GetReadNotificationIdsAsync(string staffId)
        {
            // ดึงเฉพาะ ID แจ้งเตือนที่คนๆ นี้เคยกดอ่านแล้ว
            return await _context.NotificationReads
                .Where(r => r.StaffId == staffId)
                .Select(r => r.NotificationId)
                .ToListAsync();
        }

        public async Task<List<Notification>> GetUnreadAsync(string staffId)
        {
            var readIds = await GetReadNotificationIdsAsync(staffId);

            // ดึงของส่วนรวม (null) หรือของตัวเอง (staffId) ที่ ID ไม่อยู่ในลิสต์ที่อ่านแล้ว
            return await _context.Notifications
                .Where(n => (n.TargetStaffId == null || n.TargetStaffId == staffId) && !readIds.Contains(n.Id))
                .OrderByDescending(n => n.CreatedAt)
                .Take(50)
                .ToListAsync();
        }

        public async Task<List<Notification>> GetAllMyNotificationsAsync(string staffId)
        {
            return await _context.Notifications
                .Where(n => n.TargetStaffId == null || n.TargetStaffId == staffId)
                .OrderByDescending(n => n.CreatedAt)
                .Take(100)
                .ToListAsync();
        }

        public async Task MarkAsReadAsync(int notificationId, string staffId)
        {
            // เช็คก่อนว่าเคยกดอ่านไปหรือยัง
            bool exists = await _context.NotificationReads.AnyAsync(r => r.NotificationId == notificationId && r.StaffId == staffId);
            if (!exists)
            {
                _context.NotificationReads.Add(new NotificationRead
                {
                    NotificationId = notificationId,
                    StaffId = staffId,
                    ReadAt = DateTime.Now
                });
                await _context.SaveChangesAsync();
            }
        }

        public async Task MarkAllAsReadAsync(string staffId)
        {
            var readIds = await GetReadNotificationIdsAsync(staffId);

            // หา ID ของแจ้งเตือนที่ยังไม่ได้อ่านทั้งหมด
            var unreadNotiIds = await _context.Notifications
                .Where(n => (n.TargetStaffId == null || n.TargetStaffId == staffId) && !readIds.Contains(n.Id))
                .Select(n => n.Id)
                .ToListAsync();

            // จับยัดลงตารางอ่านแล้วให้หมด
            var newReads = unreadNotiIds.Select(id => new NotificationRead
            {
                NotificationId = id,
                StaffId = staffId,
                ReadAt = DateTime.Now
            });

            _context.NotificationReads.AddRange(newReads);
            await _context.SaveChangesAsync();
        }
    }
}