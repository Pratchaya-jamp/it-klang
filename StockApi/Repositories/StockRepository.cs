using Microsoft.EntityFrameworkCore;
using StockApi.Config;
using StockApi.Entities;

namespace StockApi.Repositories
{
    public interface IStockRepository
    {
        Task<List<StockBalance>> GetStockBalancesAsync(string? searchId, string? category, string? keyword, string? variant);
    }

    public class StockRepository : IStockRepository
    {
        private readonly AppDbContext _context;

        public StockRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<StockBalance>> GetStockBalancesAsync(string? searchId, string? category, string? keyword, string? variant)
        {
            var query = _context.StockBalances.Include(x => x.Item).AsQueryable();

            if (!string.IsNullOrEmpty(category))
                query = query.Where(x => x.Item != null && x.Item.Category == category);

            // Filter Variant (Spec)
            if (!string.IsNullOrEmpty(variant))
                query = query.Where(x => x.Item != null && x.Item.Name.ToLower().Contains(variant.ToLower()));

            // Filter Keyword (Name)
            if (!string.IsNullOrEmpty(keyword))
                query = query.Where(x => x.Item != null && x.Item.Name.ToLower().Contains(keyword.ToLower()));

            if (!string.IsNullOrEmpty(searchId))
                query = query.Where(x => x.ItemCode.ToLower().Contains(searchId.ToLower()));

            return await query.OrderByDescending(x => x.CreatedAt).ToListAsync();
        }
    }
}