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
        Task<List<ItemDto>> GetDashboardAsync(string? searchId, string? category, string? keyword, string? variant);

        Task<ItemDto> CreateItemAsync(CreateItemRequest request);
        Task UpdateItemAsync(string itemCode, UpdateItemRequest request);
        Task DeleteItemAsync(string itemCode);
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

        public async Task<List<ItemDto>> GetDashboardAsync(string? searchId, string? category, string? keyword, string? variant)
        {
            var items = await _repo.GetDashboardItemsAsync(searchId, category, keyword, variant);

            return items.Select(x => new ItemDto
            {
                ItemCode = x.ItemCode,
                Name = x.Name,
                Category = x.Category,
                Unit = x.Unit,
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

        // U: Update
        public async Task UpdateItemAsync(string itemCode, UpdateItemRequest request)
        {
            // 1. หาของก่อน (Repository เรา Include StockBalance มาให้อยู่แล้ว)
            var item = await _repo.GetItemByCodeAsync(itemCode);
            if (item == null) throw new NotFoundException($"ไม่พบสินค้า Code: {itemCode}");

            // 2. เก็บเวลาปัจจุบัน
            var now = DateTime.Now;

            // 3. อัปเดตค่าใน Item (ข้อมูลหลัก)
            item.Name = request.Name;
            item.Category = request.Category;
            item.Unit = request.Unit;
            item.UpdatedAt = now; // อัปเดตเวลาของ Item

            // 4. *** เพิ่มส่วนนี้: Sync เวลาไปที่ StockBalance ด้วย ***
            // (เพื่อให้หน้า Stock Overview ขึ้นว่ามีการอัปเดตล่าสุดเมื่อกี้)
            if (item.StockBalance != null)
            {
                item.StockBalance.UpdatedAt = now;
            }

            // 5. บันทึก (Entity Framework จะฉลาดพอที่จะ Save ทั้ง Item และ StockBalance พร้อมกัน)
            await _repo.UpdateItemAsync(item);
        }

        // D: Delete
        public async Task DeleteItemAsync(string itemCode)
        {
            // 1. หาของก่อน
            var item = await _repo.GetItemByCodeAsync(itemCode);
            if (item == null) throw new NotFoundException($"ไม่พบสินค้า Code: {itemCode}");

            // 2. Validation: เช็คว่ามีของเหลือในคลังไหม?
            // (เข้าถึง StockBalance ผ่าน Navigation Property ที่ Include มาใน Repo)
            if (item.StockBalance != null && item.StockBalance.TotalQuantity > 0)
            {
                throw new BadRequestException($"ไม่สามารถลบ '{item.Name}' ได้ เพราะยังมีสินค้าคงเหลือ {item.StockBalance.TotalQuantity} ชิ้น");
            }

            // 3. ถ้าของเป็น 0 ถึงจะยอมให้ลบ
            await _repo.DeleteItemAsync(itemCode);
        }
    }
}