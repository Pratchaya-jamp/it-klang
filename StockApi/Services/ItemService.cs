using Microsoft.EntityFrameworkCore;
using StockApi.Config;
using StockApi.Dtos;
using StockApi.Entities;
using StockApi.Exceptions;
using StockApi.Repositories;

namespace StockApi.Services
{
    public interface IItemService
    {
        Task<List<ItemDto>> GetDashboardAsync(string? searchId, string? category);
        Task<ItemDto> CreateItemAsync(CreateItemRequest request);
    }

    public class ItemService : IItemService
    {
        private readonly IItemRepository _repo;
        private readonly AppDbContext _context;

        public ItemService(IItemRepository repo, AppDbContext context)
        {
            _repo = repo;
            _context = context;
        }

        public async Task<List<ItemDto>> GetDashboardAsync(string? searchId, string? category)
        {
            var items = await _repo.GetDashboardItemsAsync(searchId, category);
            return items.Select(x => new ItemDto
            {
                ItemCode = x.ItemCode,
                Name = x.Name,
                Category = x.Category,
                Unit = x.Unit,

                // จัด Format ตรงนี้
                CreatedAt = x.CreatedAt.ToString("dd/MM/yyyy HH:mm:ss"),
                UpdatedAt = x.UpdatedAt.ToString("dd/MM/yyyy HH:mm:ss")
            }).ToList();
        }

        // C: Create Item
        public async Task<ItemDto> CreateItemAsync(CreateItemRequest request)
        {
            var exists = await _context.Items.AnyAsync(x => x.ItemCode == request.ItemCode);
            if (exists) throw new BadRequestException($"รหัสสินค้า '{request.ItemCode}' มีอยู่ในระบบแล้ว");

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // ใช้เวลาไทย (ถ้าอยากให้ใน DB เป็นเวลาไทยเลย)
                // หรือใช้ DateTime.Now ตามปกติถ้าเครื่องเป็นเวลาไทยอยู่แล้ว
                var now = DateTime.Now;

                var newItem = new Item
                {
                    ItemCode = request.ItemCode,
                    Name = request.Name,
                    Category = request.Category,
                    Unit = request.Unit,
                    CreatedAt = now,
                    UpdatedAt = now
                };
                _context.Items.Add(newItem);
                await _context.SaveChangesAsync();

                var newStock = new StockBalance
                {
                    ItemCode = request.ItemCode,
                    Received = request.Quantity,
                    TotalQuantity = request.Quantity,
                    Balance = request.Quantity,
                    TempWithdrawn = 0,
                    CreatedAt = now,
                    UpdatedAt = now
                };
                _context.StockBalances.Add(newStock);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                return new ItemDto
                {
                    ItemCode = newItem.ItemCode,
                    Name = newItem.Name,
                    Category = newItem.Category,
                    Unit = newItem.Unit,

                    // จัด Format ส่งกลับ
                    CreatedAt = newItem.CreatedAt.ToString("dd/MM/yyyy HH:mm:ss"),
                    UpdatedAt = newItem.UpdatedAt.ToString("dd/MM/yyyy HH:mm:ss")
                };
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
    }
}