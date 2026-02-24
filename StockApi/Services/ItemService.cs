using Microsoft.EntityFrameworkCore;
using StockApi.Config;
using StockApi.Dtos;
using StockApi.Entities;
using StockApi.Exceptions;
using StockApi.Repositories;
using Microsoft.AspNetCore.Http;

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
        private readonly ISystemLogRepository _logRepo;
        private readonly AppDbContext _context;
        private readonly INotificationService _notiService;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public ItemService(IItemRepository repo, ISystemLogRepository logRepo, AppDbContext context, INotificationService notiService, IHttpContextAccessor httpContextAccessor)
        {
            _repo = repo;
            _logRepo = logRepo;
            _context = context;
            _notiService = notiService;
            _httpContextAccessor = httpContextAccessor;
        }

        // ✅ 4. ฟังก์ชันดึงชื่อคนล็อกอิน
        private string GetCurrentUserName()
        {
            var name = _httpContextAccessor.HttpContext?.User?.FindFirst("name")?.Value;
            return name ?? "System";
        }

        public async Task<List<ItemDto>> GetDashboardAsync(string? searchId, string? category, string? keyword, string? variant)
        {
            var query = _repo.GetDashboardQuery(searchId, category, keyword, variant);
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
            if (exists) throw new BadRequestException($"รหัสอุปกรณ์ '{request.ItemCode}' มีอยู่ในระบบแล้ว");

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var now = DateTime.Now;
                string currentUser = GetCurrentUserName(); // ✅ ดึงชื่อมาใช้

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

                // ✅ 5. ใช้ currentUser แทน "Admin"
                await _logRepo.AddLogAsync(
                    "CREATE",
                    "Items",
                    newItem.ItemCode,
                    "-",
                    $"Name: {newItem.Name}, Category: {newItem.Category}, InitialStock: {request.Quantity}",
                    currentUser
                );

                await transaction.CommitAsync();

                // ✅ เพิ่มชื่อคนทำในแจ้งเตือนด้วย
                await _notiService.SendNotificationAsync(
                    null,
                    "เพิ่มอุปกรณ์ใหม่",
                    $"คุณ {currentUser} เพิ่มอุปกรณ์ '{newItem.Name}' ({newItem.ItemCode}) จำนวน {request.Quantity} {newItem.Unit} ลงในระบบ",
                    "ITEM_CREATE");

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
            if (item == null) throw new NotFoundException($"ไม่พบอุปกรณ์ Code: {itemCode}");

            string currentUser = GetCurrentUserName(); // ✅ ดึงชื่อมาใช้

            string oldValue = $"Name: {item.Name}, Cat: {item.Category}, Unit: {item.Unit}";
            string oldName = item.Name;
            var now = DateTime.Now;

            item.Name = request.Name;
            item.Category = request.Category;
            item.Unit = request.Unit;
            item.UpdatedAt = now;

            if (item.StockBalance != null)
            {
                item.StockBalance.UpdatedAt = now;
            }

            string newValue = $"Name: {request.Name}, Cat: {request.Category}, Unit: {request.Unit}";

            // ✅ ใช้ currentUser แทน "Admin"
            await _logRepo.AddLogAsync("UPDATE", "Items", itemCode, oldValue, newValue, currentUser);

            await _repo.UpdateItemAsync(item);

            await _notiService.SendNotificationAsync(
                null,
                "แก้ไขข้อมูลอุปกรณ์",
                $"คุณ {currentUser} อัปเดตข้อมูลอุปกรณ์ '{oldName}' ({itemCode}) เรียบร้อยแล้ว",
                "ITEM_UPDATE");
        }

        // D: Delete
        public async Task DeleteItemAsync(string itemCode)
        {
            var item = await _repo.GetItemByCodeAsync(itemCode);
            if (item == null) throw new NotFoundException($"ไม่พบอุปกรณ์ Code: {itemCode}");

            if (item.StockBalance != null && item.StockBalance.TotalQuantity > 0)
            {
                throw new BadRequestException($"ไม่สามารถลบ '{item.Name}' ได้ เพราะยังมีอุปกรณ์คงเหลือ {item.StockBalance.TotalQuantity} ชิ้น");
            }

            bool hasMovement = await _context.SystemLogs.AnyAsync(x =>
                x.RecordId == itemCode &&
                (x.Action.Contains("STOCK_IN") || x.Action.Contains("STOCK_OUT"))
            );

            if (hasMovement)
            {
                throw new BadRequestException($"ไม่สามารถลบ '{item.Name}' ได้ เนื่องจากอุปกรณ์นี้เคยมีการ รับเข้า/เบิกออก ไปแล้ว (มี Audit History)");
            }

            string currentUser = GetCurrentUserName(); // ✅ ดึงชื่อมาใช้

            // ✅ ใช้ currentUser แทน "Admin"
            await _logRepo.AddLogAsync(
                "DELETE",
                "Items",
                itemCode,
                $"Name: {item.Name}",
                "DELETED",
                currentUser
            );

            await _repo.DeleteItemAsync(itemCode);

            await _notiService.SendNotificationAsync(
                null,
                "ลบอุปกรณ์",
                $"คุณ {currentUser} ลบอุปกรณ์ '{item.Name}' ({itemCode}) ออกจากระบบ",
                "ITEM_DELETE");
        }
    }
}