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
        private readonly ISystemLogRepository _logRepo; // <--- 1. เพิ่มตัวนี้
        private readonly AppDbContext _context;

        public ItemService(IItemRepository repo, ISystemLogRepository logRepo, AppDbContext context) // <--- Inject เข้ามา
        {
            _repo = repo;
            _logRepo = logRepo;
            _context = context;
        }

        public async Task<List<ItemDto>> GetDashboardAsync(string? searchId, string? category, string? keyword, string? variant)
        {
            // 1. รับ Query มา
            var query = _repo.GetDashboardQuery(searchId, category, keyword, variant);

            // 2. ทำ Projection
            var result = await query.Select(x => new ItemDto
            {
                ItemCode = x.ItemCode,
                Name = x.Name,
                Category = x.Category,
                Unit = x.Unit,
                CreatedAt = x.CreatedAt.ToString("dd/MM/yyyy HH:mm:ss"),
                UpdatedAt = x.UpdatedAt.ToString("dd/MM/yyyy HH:mm:ss")
            }).ToListAsync();

            return result;
        }

        // C: Create Item
        public async Task<ItemDto> CreateItemAsync(CreateItemRequest request)
        {
            var exists = await _context.Items.AnyAsync(x => x.ItemCode == request.ItemCode);
            if (exists) throw new BadRequestException($"รหัสสินค้า '{request.ItemCode}' มีอยู่ในระบบแล้ว");

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var now = DateTime.Now;

                // 1. สร้าง Item
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

                // 2. สร้าง Stock
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

                // 3. *** บันทึก Log: CREATE ***
                // (ใส่ตรงนี้เพื่อให้รวมอยู่ใน Transaction ถ้าพังก็ Rollback หมด)
                await _logRepo.AddLogAsync(
                    "CREATE",
                    "Items",
                    newItem.ItemCode,
                    "-",
                    $"Name: {newItem.Name}, Category: {newItem.Category}, InitialStock: {request.Quantity}",
                    "Admin"
                );

                await transaction.CommitAsync();

                return new ItemDto
                {
                    ItemCode = newItem.ItemCode,
                    Name = newItem.Name,
                    Category = newItem.Category,
                    Unit = newItem.Unit,
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
            var item = await _repo.GetItemByCodeAsync(itemCode);
            if (item == null) throw new NotFoundException($"ไม่พบสินค้า Code: {itemCode}");

            // 1. *** เก็บค่าเก่าก่อนแก้ (OldValue) ***
            string oldValue = $"Name: {item.Name}, Cat: {item.Category}, Unit: {item.Unit}";

            var now = DateTime.Now;
            item.Name = request.Name;
            item.Category = request.Category;
            item.Unit = request.Unit;
            item.UpdatedAt = now;

            if (item.StockBalance != null)
            {
                item.StockBalance.UpdatedAt = now;
            }

            // 2. *** เตรียมค่าใหม่ (NewValue) ***
            string newValue = $"Name: {request.Name}, Cat: {request.Category}, Unit: {request.Unit}";

            // 3. *** บันทึก Log: UPDATE ***
            await _logRepo.AddLogAsync("UPDATE", "Items", itemCode, oldValue, newValue, "Admin");

            await _repo.UpdateItemAsync(item);
        }

        // D: Delete
        public async Task DeleteItemAsync(string itemCode)
        {
            // 1. หาของก่อน
            var item = await _repo.GetItemByCodeAsync(itemCode);
            if (item == null) throw new NotFoundException($"ไม่พบสินค้า Code: {itemCode}");

            // 2. Validation 1: เช็คของคงเหลือ (Safety เบื้องต้น)
            if (item.StockBalance != null && item.StockBalance.TotalQuantity > 0)
            {
                throw new BadRequestException($"ไม่สามารถลบ '{item.Name}' ได้ เพราะยังมีสินค้าคงเหลือ {item.StockBalance.TotalQuantity} ชิ้น");
            }

            // 3. *** Validation 2: เช็คประวัติการเคลื่อนไหว (Stock Movement) ***
            // ยอมให้มี CREATE / UPDATE / DELETE ได้ (ถือว่าจัดการข้อมูลทั่วไป)
            // แต่ห้ามมี STOCK_IN / STOCK_OUT (ถือว่าเป็น Transaction ทางบัญชีแล้ว)

            bool hasMovement = await _context.SystemLogs.AnyAsync(x =>
                x.RecordId == itemCode &&
                (x.Action.Contains("STOCK_IN") || x.Action.Contains("STOCK_OUT"))
            );

            if (hasMovement)
            {
                throw new BadRequestException($"ไม่สามารถลบ '{item.Name}' ได้ เนื่องจากสินค้านี้เคยมีการ รับเข้า/เบิกออก ไปแล้ว (มี Audit History)");
            }

            // 4. ถ้าผ่านเงื่อนไขข้างบน แสดงว่าเป็นสินค้าที่ "สร้างผิด" หรือ "ยังไม่เคยใช้งานจริง" -> ยอมให้ลบ
            await _logRepo.AddLogAsync(
                "DELETE",
                "Items",
                itemCode,
                $"Name: {item.Name}",
                "DELETED",
                "Admin"
            );

            await _repo.DeleteItemAsync(itemCode);
        }
    }
}