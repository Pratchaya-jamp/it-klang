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
            // กรณีที่ 2: แก้ไขข้อมูลทั่วไป (Items) และยอดตั้งต้น (StockBalances)
            // =======================================================
            var trackedItem = await _context.Items.Include(x => x.StockBalance).FirstOrDefaultAsync(x => x.ItemCode == itemCode);
            if (trackedItem == null) throw new NotFoundException($"ไม่พบอุปกรณ์ Code: {itemCode}");

            //string oldName = trackedItem.Name; // ✅ คืนชีพตัวแปรนี้กลับมาใช้
            int oldQuantity = trackedItem.StockBalance?.TotalQuantity ?? 0;
            string oldValue = $"Name: {trackedItem.Name}, Cat: {trackedItem.Category}, Unit: {trackedItem.Unit}, Qty: {oldQuantity}";

            // 🕵️‍♂️ 1. ตรวจสอบว่ามีการแก้ช่องไหนบ้าง และเก็บข้อความเอาไว้
            var changedFields = new List<string>();
            string singleChangeMsg = "";

            if (trackedItem.Name != request.Name)
            {
                changedFields.Add("ชื่อ");
                singleChangeMsg = $"ชื่อเป็น '{request.Name}'";
            }
            if (trackedItem.Category != request.Category)
            {
                changedFields.Add("หมวดหมู่");
                singleChangeMsg = $"หมวดหมู่เป็น '{request.Category}'";
            }
            if (trackedItem.Unit != request.Unit)
            {
                changedFields.Add("หน่วยนับ");
                singleChangeMsg = $"หน่วยนับเป็น '{request.Unit}'";
            }
            if (oldQuantity != request.Quantity)
            {
                changedFields.Add("ยอดตั้งต้น");
                singleChangeMsg = $"ยอดตั้งต้นเป็น '{request.Quantity}'";
            }

            // ถ้ากดยืนยันแต่ไม่ได้แก้อะไรเลย ให้จบการทำงานตรงนี้ได้เลย
            if (changedFields.Count == 0) return;

            // 📦 2. จัดการอัปเดตตาราง Items (ข้อมูลทั่วไป)
            trackedItem.Name = request.Name;
            trackedItem.Category = request.Category;
            trackedItem.Unit = request.Unit;
            trackedItem.UpdatedAt = now;

            // 📊 3. จัดการอัปเดตตาราง StockBalances (ถ้ายูสเซอร์แก้ตัวเลข)
            if (trackedItem.StockBalance != null && request.Quantity != oldQuantity)
            {
                bool hasOtherActions = await _context.SystemLogs.AnyAsync(x =>
                    x.RecordId == itemCode &&
                    x.Action != "CREATE" &&
                    x.Action != "UPDATE" &&
                    x.Action != "UPDATE_CODE"
                );

                if (hasOtherActions)
                {
                    throw new BadRequestException($"ไม่สามารถแก้ไขยอดเริ่มต้นของ '{oldName}' ได้โดยตรง เนื่องจากมีการเคลื่อนไหวสต๊อกไปแล้ว กรุณาใช้เมนู 'ปรับปรุงยอด (Stock Adjust)'");
                }

                trackedItem.StockBalance.TotalQuantity = request.Quantity;
                trackedItem.StockBalance.Balance = request.Quantity;
                trackedItem.StockBalance.Received = request.Quantity;
                trackedItem.StockBalance.UpdatedAt = now;
            }

            string newValue = $"Name: {request.Name}, Cat: {request.Category}, Unit: {request.Unit}, Qty: {request.Quantity}";
            await _logRepo.AddLogAsync("UPDATE", "Items", trackedItem.ItemCode, oldValue, newValue, currentUser);

            // 🔥 สั่ง SaveChanges ครั้งเดียว
            await _context.SaveChangesAsync();

            // 🔔 4. จัดการสร้างข้อความ Noti ให้คล้ายกับกรณีแรก
            string notiMessage = "";
            if (changedFields.Count == 1)
            {
                // ถ้าแก้ช่องเดียว (เช่น: คุณ System แก้ไขหมวดหมู่เป็น 'Network' ให้กับอุปกรณ์ 'สายแลน' (IT-001) เรียบร้อยแล้ว)
                notiMessage = $"คุณ {currentUser} แก้ไข{singleChangeMsg} ให้กับอุปกรณ์ '{oldName}' ({trackedItem.ItemCode}) เรียบร้อยแล้ว";
            }
            else
            {
                // ถ้าแก้ 2 ช่องขึ้นไป (เช่น: คุณ System แก้ไขข้อมูล (ชื่อ, หมวดหมู่) ให้กับอุปกรณ์ 'สายแลน' (IT-001) เรียบร้อยแล้ว)
                notiMessage = $"คุณ {currentUser} แก้ไขข้อมูล ({string.Join(", ", changedFields)}) ให้กับอุปกรณ์ '{oldName}' ({trackedItem.ItemCode}) เรียบร้อยแล้ว";
            }

            await _notiService.SendNotificationAsync(
                null, "แก้ไขข้อมูลอุปกรณ์",
                notiMessage,
                "ITEM_UPDATE");
        }

        // D: Delete
        public async Task DeleteItemAsync(string itemCode)
        {
            // 🔥 เปิด Transaction เพราะเราต้องจัดการลบข้าม 3 ตารางให้เสร็จพร้อมกัน (Atomic)
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // โหลด Item พร้อม StockBalance ขึ้นมาเพื่อเตรียมลบ
                var item = await _context.Items.Include(i => i.StockBalance).FirstOrDefaultAsync(i => i.ItemCode == itemCode);
                if (item == null) throw new NotFoundException($"ไม่พบอุปกรณ์ Code: {itemCode}");

                // 🕵️‍♂️ 1. เช็คจาก Log เดิมว่าเคยมี Action อื่นๆ (เช่น รับเข้า/เบิก) หรือไม่
                bool hasOtherActions = await _context.SystemLogs.AnyAsync(x =>
                    x.RecordId == itemCode &&
                    x.Action != "CREATE" &&
                    x.Action != "UPDATE" &&
                    x.Action != "UPDATE_CODE"
                );

                // 🕵️‍♂️ 2. เช็คจากฝั่ง Transaction เสริมความชัวร์ ว่าเคยมีรายการอื่นที่ไม่ใช่ "ขอซื้อ (PR)" ไหม
                bool hasRealTransactions = await _context.StockTransactions.AnyAsync(t =>
                    t.ItemCode == itemCode && t.Type != "PR" && t.Type != "CANCEL_PR");

                // 🔥 เงื่อนไขการลบ
                if (hasOtherActions || hasRealTransactions)
                {
                    // ถ้า "เคย" มีการทำรายการอื่นๆ ไปแล้ว (ของถูกใช้งานจริงในระบบ) 
                    // บังคับตาม Logic เดิมของคุณคือ ยอดคงเหลือ (TotalQuantity) ต้องเป็น 0 เท่านั้นถึงจะยอมให้ลบ
                    if (item.StockBalance != null && item.StockBalance.TotalQuantity > 0)
                    {
                        throw new BadRequestException($"ไม่สามารถลบ '{item.Name}' ได้ เนื่องจากเคยมีการทำรายการ (เบิก/รับเข้า) ไปแล้ว หากต้องการลบต้องปรับยอดคงเหลือให้เป็น 0 ก่อน");
                    }
                }

                // 🗑️ 3. กวาดล้างใบคำขอซื้อ (PR) หรือใบที่ถูกยกเลิก (CANCEL_PR) ที่ค้างอยู่ทิ้งให้หมด (Hard Delete)
                var pendingPRs = await _context.StockTransactions
                    .Where(t => t.ItemCode == itemCode && (t.Type == "PR" || t.Type == "CANCEL_PR"))
                    .ToListAsync();

                if (pendingPRs.Any())
                {
                    // ลบทิ้งจาก Database ถาวร โดยไม่เก็บ Log ใดๆ ทั้งสิ้นตามเงื่อนไข
                    _context.StockTransactions.RemoveRange(pendingPRs);
                }

                string currentUser = GetCurrentUserName();

                // บันทึก Log การลบ Master Item ตามปกติ
                await _logRepo.AddLogAsync(
                    "DELETE",
                    "Items",
                    itemCode,
                    $"Name: {item.Name}",
                    "DELETED",
                    currentUser
                );

                // 🗑️ 4. ทำการลบข้อมูลที่เหลือผ่าน Context โดยตรง
                if (item.StockBalance != null)
                {
                    _context.StockBalances.Remove(item.StockBalance);
                }
                _context.Items.Remove(item); // ลบ Item Master

                // บันทึกและ Commit ทุกอย่างลง Database
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // แจ้งเตือน
                await _notiService.SendNotificationAsync(
                    null,
                    "ลบอุปกรณ์",
                    $"คุณ {currentUser} ลบอุปกรณ์ '{item.Name}' ({itemCode}) ออกจากระบบ",
                    "ITEM_DELETE");
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
    }
}