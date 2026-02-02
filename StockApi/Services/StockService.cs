using StockApi.Dtos;
using StockApi.Repositories;

namespace StockApi.Services
{
    public interface IStockService
    {
        // เพิ่ม Parameter ใน Interface
        Task<List<StockBalanceDto>> GetStockOverviewAsync(string? searchId, string? category, string? keyword);
    }

    public class StockService : IStockService
    {
        private readonly IStockRepository _repo;

        public StockService(IStockRepository repo)
        {
            _repo = repo;
        }

        // แก้ Method Implementation
        public async Task<List<StockBalanceDto>> GetStockOverviewAsync(string? searchId, string? category, string? keyword)
        {
            // ส่งค่าต่อไปให้ Repository
            var data = await _repo.GetStockBalancesAsync(searchId, category, keyword);

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

                // แปลงเวลาเป็น String Format
                CreatedAt = x.CreatedAt.ToString("dd/MM/yyyy HH:mm:ss"),
                UpdatedAt = x.UpdatedAt.ToString("dd/MM/yyyy HH:mm:ss")
            }).ToList();
        }
    }
}