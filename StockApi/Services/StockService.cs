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

            // Map ข้อมูลลง DTO
            return data.Select(x => new StockBalanceDto
            {
                ItemCode = x.ItemCode,
                // ดึงชื่อ/หมวดหมู่ จากตาราง Item ที่ Join มา
                Name = x.Item?.Name ?? "Unknown",
                Category = x.Item?.Category ?? "-",
                Unit = x.Item?.Unit ?? "-",

                TotalQuantity = x.TotalQuantity,
                TempReceived = x.TempReceived,
                TempWithdrawn = x.TempWithdrawn,
                Balance = x.Balance
            }).ToList();
        }
    }
}