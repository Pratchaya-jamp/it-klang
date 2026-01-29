using Microsoft.EntityFrameworkCore;
using StockApi.Config;
using StockApi.Entities;

namespace StockApi.Repositories
{
    public interface IItemRepository
    {
        // เพิ่ม parameter 'keyword'
        Task<List<Item>> GetDashboardItemsAsync(string? searchId, string? category, string? keyword);
    }

    public class ItemRepository : IItemRepository
    {
        private readonly AppDbContext _context;

        public ItemRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<Item>> GetDashboardItemsAsync(string? searchId, string? category, string? keyword)
        {
            var query = _context.Items.AsQueryable();

            // 1. Filter Category (หมวดหมู่หลัก)
            if (!string.IsNullOrEmpty(category))
            {
                query = query.Where(x => x.Category == category);
            }

            // 2. Filter Keyword (สเปคย่อย: เจาะจง SATA, DDR4 จากชื่อ)
            if (!string.IsNullOrEmpty(keyword))
            {
                string k = keyword.ToLower();
                query = query.Where(x => x.Name.ToLower().Contains(k));
            }

            // 3. Filter SearchId (ค้นหาเฉพาะรหัสสินค้า ตามที่ request มา)
            if (!string.IsNullOrEmpty(searchId))
            {
                string s = searchId.ToLower();
                query = query.Where(x => x.ItemCode.ToLower().Contains(s));
            }

            // เรียงจากใหม่ไปเก่า
            return await query.OrderByDescending(x => x.CreatedAt).ToListAsync();
        }
    }
}