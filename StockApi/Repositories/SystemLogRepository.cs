using Microsoft.EntityFrameworkCore; // <--- เพิ่มตัวนี้ครับ สำคัญมาก!
using StockApi.Config;
using StockApi.Entities;

namespace StockApi.Repositories
{
    public interface ISystemLogRepository
    {
        Task AddLogAsync(string action, string table, string recordId, string oldValue, string newValue, string by);
        Task<List<SystemLog>> GetAllLogsAsync();
        Task<List<SystemLog>> GetLogsByItemCodeAsync(string itemCode);
    }

    public class SystemLogRepository : ISystemLogRepository
    {
        private readonly AppDbContext _context;

        public SystemLogRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task AddLogAsync(string action, string table, string recordId, string oldValue, string newValue, string by)
        {
            var log = new SystemLog
            {
                Action = action,
                TableName = table,
                RecordId = recordId,
                OldValue = oldValue,
                NewValue = newValue,
                CreatedBy = by,
                CreatedAt = DateTime.Now
            };

            _context.SystemLogs.Add(log);
            // รอ SaveChanges จาก Service หลัก
            await _context.SaveChangesAsync();
        }

        public async Task<List<SystemLog>> GetAllLogsAsync()
        {
            return await _context.SystemLogs
                .AsNoTracking() // ตอนนี้จะใช้ได้แล้ว
                .OrderByDescending(x => x.CreatedAt)
                .Take(1000)
                .ToListAsync();
        }

        public async Task<List<SystemLog>> GetLogsByItemCodeAsync(string itemCode)
        {
            return await _context.SystemLogs
                .AsNoTracking()
                .Where(x => x.RecordId == itemCode)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();
        }
    }
}