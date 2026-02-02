using Microsoft.EntityFrameworkCore;
using StockApi.Config;
using StockApi.Entities;

namespace StockApi.Repositories
{
    public interface IItemRepository
    {
        // เพิ่ม variant
        Task<List<Item>> GetDashboardItemsAsync(string? searchId, string? category, string? keyword, string? variant);
    }

    public class ItemRepository : IItemRepository
    {
        private readonly AppDbContext _context;

        public ItemRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<Item>> GetDashboardItemsAsync(string? searchId, string? category, string? keyword, string? variant)
        {
            var query = _context.Items.AsQueryable();

            // 1. Category (หมวดหมู่)
            if (!string.IsNullOrEmpty(category))
                query = query.Where(x => x.Category == category);

            // 2. Variant (สเปคย่อย: USB, 500GB, DDR4) **ของใหม่**
            // ใช้ Contains เหมือนกัน เพราะค่าพวกนี้ฝังอยู่ในชื่อ
            if (!string.IsNullOrEmpty(variant))
                query = query.Where(x => x.Name.ToLower().Contains(variant.ToLower()));

            // 3. Keyword (คำค้นหาชื่อเพิ่มเติม เช่น ยี่ห้อ)
            if (!string.IsNullOrEmpty(keyword))
                query = query.Where(x => x.Name.ToLower().Contains(keyword.ToLower()));

            // 4. SearchId (รหัสสินค้า)
            if (!string.IsNullOrEmpty(searchId))
                query = query.Where(x => x.ItemCode.ToLower().Contains(searchId.ToLower()));

            return await query.OrderByDescending(x => x.CreatedAt).ToListAsync();
        }
    }
}