using Microsoft.EntityFrameworkCore;
using StockApi.Config;
using StockApi.Entities;

namespace StockApi.Repositories
{
    // Interface
    public interface IItemRepository
    {
        Task<List<Item>> GetDashboardItemsAsync(string? searchId, string? category);
    }

    // Implementation
    public class ItemRepository : IItemRepository
    {
        private readonly AppDbContext _context;

        public ItemRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<Item>> GetDashboardItemsAsync(string? searchId, string? category)
        {
            var query = _context.Items.AsQueryable();

            if (!string.IsNullOrEmpty(searchId))
            {
                // ค้นหาแบบ Contains (เช่น พิมพ์ 001 ก็เจอ IT-001)
                query = query.Where(x => x.ItemCode.Contains(searchId));
            }

            if (!string.IsNullOrEmpty(category))
            {
                query = query.Where(x => x.Category == category);
            }

            return await query.ToListAsync();
        }
    }
}