using StockApi.Dtos;
using StockApi.Repositories;

namespace StockApi.Services
{
    public interface IStockService
    {
        Task<List<StockBalanceDto>> GetStockOverviewAsync();
    }

    public class StockService : IStockService
    {
        private readonly IStockRepository _repo;

        public StockService(IStockRepository repo)
        {
            _repo = repo;
        }

        public async Task<List<StockBalanceDto>> GetStockOverviewAsync()
        {
            var data = await _repo.GetStockBalancesAsync();

            return data.Select(x => new StockBalanceDto
            {
                ItemCode = x.ItemCode,
                Name = x.Item?.Name ?? "Unknown",
                Category = x.Item?.Category ?? "-",
                Unit = x.Item?.Unit ?? "-",
                TotalQuantity = x.TotalQuantity,
                Received = x.Received,
                Balance = x.Balance,
                TempWithdrawn = x.TempWithdrawn,

                // จัด Format ตรงนี้
                CreatedAt = x.CreatedAt.ToString("dd/MM/yyyy HH:mm:ss"),
                UpdatedAt = x.UpdatedAt.ToString("dd/MM/yyyy HH:mm:ss")
            }).ToList();
        }
    }
}