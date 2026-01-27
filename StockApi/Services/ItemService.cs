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
                Unit = x.Unit
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
                // 1. สร้าง Item
                var newItem = new Item
                {
                    ItemCode = request.ItemCode,
                    Name = request.Name,
                    Category = request.Category,
                    Unit = request.Unit
                };
                _context.Items.Add(newItem);
                await _context.SaveChangesAsync();

                // 2. สร้าง StockBalance
                var newStock = new StockBalance
                {
                    ItemCode = request.ItemCode,

                    // ยอดรับเข้าสะสม (Received): บันทึกว่ารับมาเท่าไหร่
                    Received = request.Quantity,

                    // ยอดรวมในคลัง (Total): มีของเท่าไหร่
                    TotalQuantity = request.Quantity,

                    // ยอดคงเหลือ (Balance): พร้อมใช้เท่าไหร่
                    Balance = request.Quantity,

                    TempWithdrawn = 0
                };
                _context.StockBalances.Add(newStock);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                return new ItemDto
                {
                    ItemCode = newItem.ItemCode,
                    Name = newItem.Name,
                    Category = newItem.Category,
                    Unit = newItem.Unit
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