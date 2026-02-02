using Microsoft.EntityFrameworkCore;
using StockApi.Config;
using StockApi.Entities;

namespace StockApi.Repositories
{
    public interface IStockRepository
    {
        // เพิ่ม Parameter 3 ตัว
        Task<List<StockBalance>> GetStockBalancesAsync(string? searchId, string? category, string? keyword);
    }

    public class StockRepository : IStockRepository
    {
        private readonly AppDbContext _context;

        public StockRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<StockBalance>> GetStockBalancesAsync(string? searchId, string? category, string? keyword)
        {
            // ต้อง Include Item เข้ามาด้วย ไม่งั้นจะกรอง Category/Name ไม่ได้
            var query = _context.StockBalances.Include(x => x.Item).AsQueryable();

            // 1. Filter Category (ดูจากตาราง Item ที่ Join มา)
            if (!string.IsNullOrEmpty(category))
            {
                query = query.Where(x => x.Item != null && x.Item.Category == category);
            }

            // 2. Filter Keyword (สเปคย่อย: SATA, DDR4 จากชื่อ Item)
            if (!string.IsNullOrEmpty(keyword))
            {
                string k = keyword.ToLower();
                query = query.Where(x => x.Item != null && x.Item.Name.ToLower().Contains(k));
            }

            // 3. Filter SearchId (รหัสสินค้า จากตาราง Stock เองได้เลย)
            if (!string.IsNullOrEmpty(searchId))
            {
                string s = searchId.ToLower();
                query = query.Where(x => x.ItemCode.ToLower().Contains(s));
            }

            // เรียงลำดับจากของใหม่ไปเก่า
            return await query.OrderByDescending(x => x.CreatedAt).ToListAsync();
        }
    }
}