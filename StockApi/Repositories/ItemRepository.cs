using Microsoft.EntityFrameworkCore;
using StockApi.Config;
using StockApi.Entities;

namespace StockApi.Repositories
{
    public interface IItemRepository
    {
        // เปลี่ยนเป็น IQueryable เพื่อให้ Service ทำ Projection (เลือกฟิลด์) ได้
        IQueryable<Item> GetDashboardQuery(string? searchId, string? category, string? keyword, string? variant);

        Task<Item?> GetItemByCodeAsync(string itemCode);
        Task UpdateItemAsync(Item item);
        Task DeleteItemAsync(string itemCode);
    }

    public class ItemRepository : IItemRepository
    {
        private readonly AppDbContext _context;

        public ItemRepository(AppDbContext context)
        {
            _context = context;
        }

        // 1. GET: ส่ง Query เปล่าๆ ออกไป (เร็วมาก เพราะยังไม่ดึงข้อมูลจริง)
        public IQueryable<Item> GetDashboardQuery(string? searchId, string? category, string? keyword, string? variant)
        {
            // AsNoTracking สำคัญมากสำหรับการอ่านข้อมูล (เร็วขึ้น 20-30%)
            var query = _context.Items.AsNoTracking().AsQueryable();

            if (!string.IsNullOrEmpty(category)) query = query.Where(x => x.Category == category);
            if (!string.IsNullOrEmpty(variant)) query = query.Where(x => x.Name.ToLower().Contains(variant.ToLower()));
            if (!string.IsNullOrEmpty(keyword)) query = query.Where(x => x.Name.ToLower().Contains(keyword.ToLower()));
            if (!string.IsNullOrEmpty(searchId)) query = query.Where(x => x.ItemCode.ToLower().Contains(searchId.ToLower()));

            return query.OrderByDescending(x => x.CreatedAt);
        }

        // 2. Get Single
        public async Task<Item?> GetItemByCodeAsync(string itemCode)
        {
            return await _context.Items
                .Include(x => x.StockBalance)
                .FirstOrDefaultAsync(x => x.ItemCode == itemCode);
        }

        // 3. Update
        public async Task UpdateItemAsync(Item item)
        {
            _context.Items.Update(item);
            await _context.SaveChangesAsync();
        }

        // 4. Delete (High Performance)
        public async Task DeleteItemAsync(string itemCode)
        {
            // ใช้ ExecuteDeleteAsync ลบที่ Database โดยตรง (ไม่ต้องดึงมาเช็คก่อน)
            // เร็วกว่าแบบเดิม 3-4 เท่า
            await _context.StockBalances
                .Where(x => x.ItemCode == itemCode)
                .ExecuteDeleteAsync();

            await _context.Items
                .Where(x => x.ItemCode == itemCode)
                .ExecuteDeleteAsync();
        }
    }
}