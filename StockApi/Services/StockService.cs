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
                Balance = x.Balance,

                // Map ค่าจาก Database ใส่ DTO ตรงนี้ครับ
                Received = x.Received,
                TempWithdrawn = x.TempWithdrawn
            }).ToList();
        }
    }
}