using Microsoft.EntityFrameworkCore;
using StockApi.Config;
using StockApi.Entities;

namespace StockApi.Repositories
{
    public interface IStockRepository
    {
        Task<List<StockBalance>> GetStockBalancesAsync();
    }

    public class StockRepository : IStockRepository
    {
        private readonly AppDbContext _context;

        public StockRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<StockBalance>> GetStockBalancesAsync()
        {
            return await _context.StockBalances
                .Include(s => s.Item)
                .AsNoTracking()
                .ToListAsync();
        }
    }
}