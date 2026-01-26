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
        private readonly AppDbContext _context; // ใช้ Context เพื่อทำ Transaction

        public ItemService(IItemRepository repo, AppDbContext context)
        {
            _repo = repo;
            _context = context;
        }

        // R: อ่านข้อมูล Dashboard
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

        // C: สร้าง Item ใหม่ (และสร้าง Stock 0 แถมให้ทันที)
        public async Task<ItemDto> CreateItemAsync(CreateItemRequest request)
        {
            // 1. เช็คซ้ำ (เหมือนเดิม)
            var exists = await _context.Items.AnyAsync(x => x.ItemCode == request.ItemCode);
            if (exists) throw new BadRequestException($"รหัสสินค้า '{request.ItemCode}' มีอยู่ในระบบแล้ว");

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Step A: สร้าง Item (เหมือนเดิม)
                var newItem = new Item
                {
                    ItemCode = request.ItemCode,
                    Name = request.Name,
                    Category = request.Category,
                    Unit = request.Unit
                };
                _context.Items.Add(newItem);
                await _context.SaveChangesAsync();

                // Step B: สร้าง StockBalance (แก้ยอดตรงนี้!)
                var newStock = new StockBalance
                {
                    ItemCode = request.ItemCode,

                    // ใช้ค่าจาก Request เลยครับ
                    TotalQuantity = request.Quantity,
                    Balance = request.Quantity,

                    // ส่วน Temp ยังเป็น 0 เพราะยังไม่มีการจอง
                    TempReceived = 0,
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