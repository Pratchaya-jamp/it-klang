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
                JobNo = x.JobNo, // 🔥 เพิ่มบรรทัดนี้ให้หน้า Dashboard เห็นเลข Job
                CreatedAt = x.CreatedAt.ToString("dd/MM/yyyy HH:mm:ss"),
                UpdatedAt = x.UpdatedAt.ToString("dd/MM/yyyy HH:mm:ss")
            }).ToListAsync();

            return result;
        }

        // C: Create Item
        public async Task<ItemDto> CreateItemAsync(CreateItemRequest request)
        {
            // 🔥 1. เช็คว่ายูสเซอร์กรอกรหัสมาไหม ถ้าไม่กรอกให้ Gen คำว่า DRAFT- อัตโนมัติ
            bool isDraft = string.IsNullOrWhiteSpace(request.ItemCode);
            string finalItemCode = isDraft
                ? $"DRAFT-{Guid.NewGuid().ToString("N").Substring(0, 6).ToUpper()}"
                : request.ItemCode!;

            var exists = await _context.Items.AnyAsync(x => x.ItemCode == finalItemCode);
            if (exists) throw new BadRequestException($"รหัสอุปกรณ์ '{finalItemCode}' มีอยู่ในระบบแล้ว");

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var now = DateTime.Now;
                string currentUser = GetCurrentUserName();

                var newItem = new Item
                {
                    ItemCode = finalItemCode, // ✅ ใช้รหัสที่สกรีนมาแล้ว
                    Name = request.Name,
                    Category = request.Category,
                    Unit = request.Unit,
                    JobNo = request.JobNo,
                    CreatedAt = now,
                    UpdatedAt = now
                };
                _context.Items.Add(newItem);
                await _context.SaveChangesAsync();

                var newStock = new StockBalance
                {
                    ItemCode = finalItemCode, // ✅ ผูกกับรหัสใหม่
                    Received = request.Quantity,
                    TotalQuantity = request.Quantity,
                    Balance = request.Quantity,
                    TempWithdrawn = 0,
                    CreatedAt = now,
                    UpdatedAt = now
                };
                _context.StockBalances.Add(newStock);
                await _context.SaveChangesAsync();

                await _logRepo.AddLogAsync(
                    "CREATE", "Items", newItem.ItemCode, "-",
                    $"Name: {newItem.Name}, Category: {newItem.Category}, InitialStock: {request.Quantity}{(isDraft ? " (DRAFT)" : "")}",
                    currentUser
                );

                await transaction.CommitAsync();

                await _notiService.SendNotificationAsync(
                    null, "เพิ่มอุปกรณ์ใหม่",
                    $"คุณ {currentUser} เพิ่มอุปกรณ์ '{newItem.Name}' ({newItem.ItemCode}) จำนวน {request.Quantity} {newItem.Unit} ลงในระบบ",
                    "ITEM_CREATE");

                return new ItemDto
                {
                    ItemCode = newItem.ItemCode,
                    Name = newItem.Name,
                    Category = newItem.Category,
                    Unit = newItem.Unit,
                    JobNo = newItem.JobNo,
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
            // 🔥 ใช้ AsNoTracking เพื่อปลดล็อกให้เราจัดการ ItemCode (Primary Key) ได้
            var item = await _context.Items.AsNoTracking().Include(x => x.StockBalance).FirstOrDefaultAsync(x => x.ItemCode == itemCode);
            if (item == null) throw new NotFoundException($"ไม่พบอุปกรณ์ Code: {itemCode}");

            string currentUser = GetCurrentUserName();
            string oldName = item.Name;
            var now = DateTime.Now;

            // =======================================================
            // กรณีที่ 1: เปลี่ยนรหัสจาก DRAFT เป็นรหัสจริง
            // =======================================================
            if (!string.IsNullOrWhiteSpace(request.ItemCode) && request.ItemCode != item.ItemCode)
            {
                if (!item.ItemCode.StartsWith("DRAFT-"))
                    throw new BadRequestException("ไม่สามารถแก้ไขรหัสสินค้าได้ เนื่องจากอุปกรณ์นี้ไม่ได้อยู่ในสถานะร่าง (Draft) แล้ว");

                var exists = await _context.Items.AnyAsync(x => x.ItemCode == request.ItemCode);
                if (exists) throw new BadRequestException($"รหัสอุปกรณ์ '{request.ItemCode}' มีคนใช้ไปแล้ว");

                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    // 1. สั่งลบตารางลูกและตารางแม่ของรหัส Draft ทิ้ง (ลบตรงๆ ที่ระดับ Database เร็วและไม่ติด Tracking)
                    await _context.StockBalances.Where(x => x.ItemCode == itemCode).ExecuteDeleteAsync();
                    await _context.Items.Where(x => x.ItemCode == itemCode).ExecuteDeleteAsync();

                    // 2. สร้าง Item ใหม่ ด้วยรหัสใหม่เอี่ยม
                    var newItem = new Item
                    {
                        ItemCode = request.ItemCode,
                        Name = request.Name,
                        Category = request.Category,
                        Unit = request.Unit,
                        JobNo = item.JobNo,
                        CreatedAt = item.CreatedAt,
                        UpdatedAt = now
                    };
                    _context.Items.Add(newItem);
                    await _context.SaveChangesAsync();

                    // 3. สร้าง StockBalance ใหม่ ผูกกับรหัสใหม่ (ตัวเลขดึงมาจากของเดิมทั้งหมด)
                    if (item.StockBalance != null)
                    {
                        var newStock = new StockBalance
                        {
                            ItemCode = request.ItemCode,
                            TotalQuantity = item.StockBalance.TotalQuantity,
                            Received = item.StockBalance.Received,
                            TempWithdrawn = item.StockBalance.TempWithdrawn,
                            Balance = item.StockBalance.Balance,
                            LastReceivedDate = item.StockBalance.LastReceivedDate,
                            CreatedAt = item.StockBalance.CreatedAt,
                            UpdatedAt = now
                        };
                        _context.StockBalances.Add(newStock);
                        await _context.SaveChangesAsync();
                    }

                    // 4. อัปเดตประวัติ Log เก่าๆ ที่เคยเป็นชื่อ DRAFT- ให้เปลี่ยนเป็นรหัสใหม่ด้วย 
                    await _context.SystemLogs
                        .Where(x => x.RecordId == itemCode)
                        .ExecuteUpdateAsync(s => s.SetProperty(x => x.RecordId, request.ItemCode));

                    await transaction.CommitAsync();

                    await _logRepo.AddLogAsync("UPDATE_CODE", "Items", request.ItemCode, itemCode, request.ItemCode, currentUser);
                    
                    await _notiService.SendNotificationAsync(
                        null, "ยืนยันรหัสอุปกรณ์",
                        $"คุณ {currentUser} บันทึกรหัสจริง '{request.ItemCode}' ให้กับอุปกรณ์ '{request.Name}' เรียบร้อยแล้ว",
                        "ITEM_UPDATE");

                    return; // 💥 จบการทำงานเลย เพราะเปลี่ยนรหัสเสร็จแล้ว
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            }

            // =======================================================
            // กรณีที่ 2: แก้ไขข้อมูลทั่วไปโดยไม่ได้เปลี่ยนรหัส
            // =======================================================
            var trackedItem = await _context.Items.Include(x => x.StockBalance).FirstOrDefaultAsync(x => x.ItemCode == itemCode);
            
            string oldValue = $"Name: {trackedItem!.Name}, Cat: {trackedItem.Category}, Unit: {trackedItem.Unit}";
            
            trackedItem.Name = request.Name;
            trackedItem.Category = request.Category;
            trackedItem.Unit = request.Unit;
            trackedItem.UpdatedAt = now;

            if (trackedItem.StockBalance != null)
            {
                trackedItem.StockBalance.UpdatedAt = now;
            }

            string newValue = $"Name: {request.Name}, Cat: {request.Category}, Unit: {request.Unit}";
            await _logRepo.AddLogAsync("UPDATE", "Items", trackedItem.ItemCode, oldValue, newValue, currentUser);

            await _context.SaveChangesAsync();

            await _notiService.SendNotificationAsync(
                null, "แก้ไขข้อมูลอุปกรณ์",
                $"คุณ {currentUser} อัปเดตข้อมูลอุปกรณ์ '{oldName}' รหัสปัจจุบันคือ ({trackedItem.ItemCode}) เรียบร้อยแล้ว",
                "ITEM_UPDATE");
        }

        // D: Delete
        public async Task DeleteItemAsync(string itemCode)
        {
            var item = await _repo.GetItemByCodeAsync(itemCode);
            if (item == null) throw new NotFoundException($"ไม่พบอุปกรณ์ Code: {itemCode}");

            // 🔥 1. เช็คว่าเคยมี Action อื่นๆ ที่ไม่ใช่ CREATE กับ UPDATE หรือไม่ (เช่น STOCK_IN, STOCK_OUT, BORROW, RETURN)
            bool hasOtherActions = await _context.SystemLogs.AnyAsync(x =>
                x.RecordId == itemCode &&
                x.Action != "CREATE" &&
                x.Action != "UPDATE" && 
                x.Action != "UPDATE_CODE" // อนุญาตให้เปลี่ยนรหัสลบได้
            );

            // 🔥 2. เงื่อนไขการลบ
            if (hasOtherActions)
            {
                // ถ้า "เคย" มีการทำรายการอื่นๆ ไปแล้ว (ของถูกใช้งานจริง) 
                // บังคับว่ายอดคงเหลือ (TotalQuantity) ต้องเป็น 0 เท่านั้นถึงจะยอมให้ลบ
                if (item.StockBalance != null && item.StockBalance.TotalQuantity > 0)
                {
                    throw new BadRequestException($"ไม่สามารถลบ '{item.Name}' ได้ เนื่องจากเคยมีการทำรายการ (เบิก/รับเข้า) ไปแล้ว หากต้องการลบต้องปรับยอดคงเหลือให้เป็น 0 ก่อน");
                }
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