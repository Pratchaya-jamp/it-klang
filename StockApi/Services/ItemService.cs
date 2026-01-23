using StockApi.Dtos;
using StockApi.Repositories;

namespace StockApi.Services
{
    public interface IItemService
    {
        Task<List<ItemDto>> GetDashboardAsync(string? searchId, string? category);
    }

    public class ItemService : IItemService
    {
        private readonly IItemRepository _repo;

        public ItemService(IItemRepository repo)
        {
            _repo = repo;
        }

        public async Task<List<ItemDto>> GetDashboardAsync(string? searchId, string? category)
        {
            // ดึงข้อมูลจาก Repository
            var items = await _repo.GetDashboardItemsAsync(searchId, category);

            // แปลง Entity เป็น DTO
            return items.Select(x => new ItemDto
            {
                ItemCode = x.ItemCode,
                Name = x.Name,
                Category = x.Category,
                Unit = x.Unit
            }).ToList();
        }
    }
}