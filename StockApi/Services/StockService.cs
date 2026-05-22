using Microsoft.EntityFrameworkCore;
using StockApi.Config;
using StockApi.Dtos;
using StockApi.Entities;
using StockApi.Repositories;
using Microsoft.AspNetCore.Http;
using StockApi.Exceptions;

namespace StockApi.Services
{
    public interface IStockService
    {
        Task<List<StockBalanceDto>> GetStockOverviewAsync(string? searchId, string? category, string? keyword, string? variant);

        Task RequestPurchaseAsync(List<PurchaseRequestDto> requests); // 1. ขอซื้อ
        Task ReceiveStockAsync(List<ReceiveRequest> requests);        // 2. รับเข้า
        Task RequestWithdrawAsync(List<WithdrawRequest> requests);    // 3. ทำเรื่องเบิก
        Task ApproveWithdrawAsync(ApproveWithdrawRequest request);    // 4. อนุมัติเบิก
        Task WriteOffStockAsync(WriteOffRequest request);             // 5. ตัดทิ้ง

        Task<List<PendingWithdrawalDto>> GetPurchaseRequestsAsync();
        Task<List<PendingWithdrawalDto>> GetPendingWithdrawalsAsync();
        Task<List<WriteOffSummaryDto>> GetWriteOffSummaryAsync();
        Task<List<PurchaseHistoryDto>> GetPurchaseHistoryAsync(); // 🔥 เพิ่มสำหรับประวัติจัดซื้อ
        Task<List<WithdrawHistoryDto>> GetWithdrawHistoryAsync(); // 🔥 เพิ่มสำหรับประวัติเบิกจ่าย
        Task CancelPurchaseRequestAsync(CancelRequestDto request); // 🔥 เพิ่มสำหรับยกเลิกใบขอซื้อ
        Task CancelWithdrawRequestAsync(CancelRequestDto request); // 🔥 เพิ่มสำหรับยกเลิกใบขอเบิก
        Task<List<PurchaseHistoryDto>> GetCanceledPurchaseRequestsAsync(); // 🔥 เพิ่ม GET ประวัติยกเลิกซื้อ
        Task<List<WithdrawHistoryDto>> GetCanceledWithdrawRequestsAsync(); // 🔥 เพิ่ม GET ประวัติยกเลิกเบิก
    }

    public class StockService : IStockService
    {
        private readonly IStockRepository _repo;
        private readonly ITransactionRepository _txRepo;
        private readonly ISystemLogRepository _logRepo;
        private readonly AppDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly INotificationService _notiService;

        public StockService(IStockRepository repo, ITransactionRepository txRepo, ISystemLogRepository logRepo, AppDbContext context, IHttpContextAccessor httpContextAccessor, INotificationService notiService)
        {
            _repo = repo;
            _txRepo = txRepo;
            _logRepo = logRepo;
            _context = context;
            _httpContextAccessor = httpContextAccessor;
            _notiService = notiService;
        }

        // ... (GetStockOverviewAsync เหมือนเดิม 100% ก๊อปของเดิมมาแปะได้เลย ผมขอข้ามเพื่อความกระชับ) ...
        public async Task<List<StockBalanceDto>> GetStockOverviewAsync(string? searchId, string? category, string? keyword, string? variant)
        {
            var data = await _repo.GetStockBalancesAsync(searchId, category, keyword, variant);
            var today = DateTime.Now.Date;
            var itemCodes = data.Select(x => x.ItemCode).ToList();

            var borrowedData = await _context.BorrowTransactions
                .Where(b => itemCodes.Contains(b.ItemCode) && b.Status == "Borrowed")
                .GroupBy(b => b.ItemCode)
                .Select(g => new { ItemCode = g.Key, TotalBorrowed = g.Sum(x => x.Quantity) })
                .ToDictionaryAsync(k => k.ItemCode, v => v.TotalBorrowed);

            return data.Select(x => new StockBalanceDto
            {
                ItemCode = x.ItemCode,
                Name = x.Item?.Name ?? "Unknown",
                Category = x.Item?.Category ?? "-",
                Unit = x.Item?.Unit ?? "-",
                TotalQuantity = x.TotalQuantity,
                Balance = x.Balance,
                TempWithdrawn = x.TempWithdrawn,
                Borrowed = borrowedData.ContainsKey(x.ItemCode) ? borrowedData[x.ItemCode] : 0,
                Received = (x.LastReceivedDate.Date == today) ? x.Received : 0,
                CreatedAt = x.CreatedAt.ToString("dd/MM/yyyy HH:mm:ss"),
                UpdatedAt = x.UpdatedAt.ToString("dd/MM/yyyy HH:mm:ss")
            }).ToList();
        }

        private string GetCurrentUserName()
        {
            return _httpContextAccessor.HttpContext?.User?.FindFirst("name")?.Value ?? "System";
        }

        private string GenerateTransactionNo()
        {
            return $"TRX-{DateTime.Now:yyyyMMdd}-{Guid.NewGuid().ToString().Substring(0, 5).ToUpper()}";
        }

        // 📝 1. ขอซื้อ (PR) - เพิ่มกลไกสร้าง Item ใหม่อัตโนมัติทันทีเมื่อเป็นอุปกรณ์ใหม่
        public async Task RequestPurchaseAsync(List<PurchaseRequestDto> requests)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                string currentUser = GetCurrentUserName();
                var notiMessages = new List<string>();

                foreach (var request in requests)
                {
                    string finalItemCode = request.ItemCode ?? "";

                    // 🎯 เคสที่ 1: เป็นอุปกรณ์ใหม่ที่ยังไม่เคยมีในฐานข้อมูล
                    if (request.IsNewItem)
                    {
                        // ตรวจสอบเงื่อนไขการกรอกข้อมูลพื้นฐาน
                        if (string.IsNullOrWhiteSpace(request.ItemName)) throw new BadRequestException("กรุณาระบุชื่ออุปกรณ์ใหม่");

                        // เช็คกลไกการตั้งรหัสผ่าน Toggle
                        if (request.AutoGenerateCode)
                        {
                            // ระบบเจนรหัสชั่วคราวให้เองอัตโนมัติ
                            finalItemCode = $"DRAFT-{DateTime.Now:yyyyMMdd}-{Guid.NewGuid().ToString().Substring(0, 4).ToUpper()}";
                        }
                        else
                        {
                            // ยูสเซอร์เลือกกรอกรหัสเอง
                            if (string.IsNullOrWhiteSpace(finalItemCode)) throw new BadRequestException("กรุณาระบุรหัสอุปกรณ์ที่คุณต้องการตั้งเอง");
                        }

                        // ตรวจสอบความซ้ำซ้อนของไอดีในระบบหลัก
                        var isDuplicate = await _context.Items.AnyAsync(i => i.ItemCode == finalItemCode);
                        if (isDuplicate) throw new BadRequestException($"ไม่สามารถสร้างได้ เนื่องจากรหัสอุปกรณ์ '{finalItemCode}' มีอยู่เดิมในระบบแล้ว");

                        // 1. วิ่งไป Insert สร้างข้อมูลที่ตารางหลัก Items เดี๋ยวนั้นเลย (ไม่มีฟิลด์ JobNo แล้วตามแผน)
                        var newItem = new Item
                        {
                            ItemCode = finalItemCode,
                            Name = request.ItemName,
                            Category = !string.IsNullOrEmpty(request.Category) ? request.Category : "-",
                            Unit = !string.IsNullOrEmpty(request.Unit) ? request.Unit : "ชิ้น",
                            CreatedAt = DateTime.Now,
                            UpdatedAt = DateTime.Now
                        };
                        _context.Items.Add(newItem);

                        // 2. สร้างยอดตั้งต้นที่ตาราง StockBalances โดยเซ็ตยอดสต๊อกเริ่มต้นเป็น 0 ทั้งหมดตามที่ตกลงกันไว้
                        var newStockBalance = new StockBalance
                        {
                            ItemCode = finalItemCode,
                            TotalQuantity = 0, // สต๊อกรวมเป็น 0
                            Balance = 0,       // ของในตู้เป็น 0
                            TempWithdrawn = 0,
                            Received = 0,
                            LastReceivedDate = DateTime.Now,
                            CreatedAt = DateTime.Now,
                            UpdatedAt = DateTime.Now
                        };
                        _context.StockBalances.Add(newStockBalance);

                        // บันทึก Log ประวัติการลงทะเบียนของใหม่เบื้องหลัง
                        await _logRepo.AddLogAsync("AUTO_CREATE_ITEM", "Items", finalItemCode, "New Register", $"สร้างอุปกรณ์ใหม่ผ่านระบบขอซื้อโดยคุณ {currentUser}", currentUser);
                    }
                    else
                    {
                        // เคสที่ 2: เป็นของเก่าที่มีในตู้ปกติ วิ่งเช็คตามเดิม
                        var exists = await _context.StockBalances.AnyAsync(x => x.ItemCode == finalItemCode);
                        if (!exists) throw new NotFoundException($"ไม่พบอุปกรณ์รหัส '{finalItemCode}' ในระบบ หากเป็นของใหม่กรุณาเปิดใช้ฟังก์ชันเพิ่มอุปกรณ์ใหม่");
                    }

                    // 3. ทำการบันทึกใบคำขอสั่งซื้อ (PR) ลงตาราง Transaction เชื่อมต่อโฟลว์ตามปกติ
                    await _txRepo.AddTransactionAsync(new StockTransaction
                    {
                        TransactionNo = GenerateTransactionNo(),
                        ItemCode = finalItemCode, // ผูกรหัสที่สรุปได้ (ไม่ว่าจะตั้งเองหรือระบบสุ่มให้)
                        Type = "PR",
                        Quantity = request.Quantity,
                        BalanceAfter = 0, // เนื่องจากของเปิดใหม่ ยอดหลังธุรกรรมจึงบันทึกเป็น 0 ไว้ก่อน
                        JobNo = request.JobNo,
                        Note = request.IsNewItem
                            ? $"[ขอซื้ออุปกรณ์ใหม่] {request.Note ?? ""}"
                            : (request.Note ?? ""),
                        CreatedBy = currentUser,
                        CreatedAt = DateTime.Now
                    });

                    notiMessages.Add($"- 🛒 ขอซื้อ {request.ItemName ?? finalItemCode} จำนวน {request.Quantity} ชิ้น [Job: {request.JobNo}]");
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                if (notiMessages.Any()) await _notiService.SendNotificationAsync(null, "แจ้งขอสั่งซื้ออุปกรณ์", $"คุณ {currentUser} ทำเรื่องขอสั่งซื้ออุปกรณ์ใหม่:\n" + string.Join("\n", notiMessages), "STOCK_PR");
            }
            catch { await transaction.RollbackAsync(); throw; }
        }

        // 📥 2. รับของเข้าคลัง (IN) - เพิ่ม Stock และนำยอดไปหักล้างใบขอซื้อ (PR) ของ Job นั้นๆ
        public async Task ReceiveStockAsync(List<ReceiveRequest> requests)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                string currentUser = GetCurrentUserName();
                var notiMessages = new List<string>();

                foreach (var request in requests)
                {
                    if (request.ItemCode.StartsWith("DRAFT-")) throw new BadRequestException($"อุปกรณ์ ({request.ItemCode}) ยังไม่มีรหัสจริง รับเข้าไม่ได้");
                    var stock = await _context.StockBalances.Include(s => s.Item).FirstOrDefaultAsync(x => x.ItemCode == request.ItemCode);
                    if (stock == null) throw new Exception($"ไม่พบอุปกรณ์ Code: {request.ItemCode}");

                    int oldBalance = stock.Balance;
                    var today = DateTime.Now.Date;
                    if (stock.LastReceivedDate.Date < today) stock.Received = request.Quantity;
                    else stock.Received += request.Quantity;
                    stock.LastReceivedDate = DateTime.Now;

                    // ✅ ของเพิ่มเข้าคลังปกติ
                    stock.Balance += request.Quantity;
                    stock.TotalQuantity += request.Quantity;
                    stock.UpdatedAt = DateTime.Now;

                    // บันทึกบิลการรับเข้า โดยผูกกับ JobNo เพื่อเอาไปคำนวณหักล้างยอดค้างในใบขอซื้อ
                    await _txRepo.AddTransactionAsync(new StockTransaction
                    {
                        TransactionNo = GenerateTransactionNo(),
                        ItemCode = request.ItemCode,
                        Type = "IN",
                        Quantity = request.Quantity,
                        BalanceAfter = stock.Balance,
                        JobNo = request.JobNo, // ผูก Job เคลียร์ยอดคำขอซื้อ
                        Note = request.Note,
                        CreatedBy = currentUser,
                        CreatedAt = DateTime.Now
                    });

                    await _logRepo.AddLogAsync($"STOCK_IN (+{request.Quantity})", "StockBalances", request.ItemCode, $"Balance: {oldBalance}", $"Balance: {stock.Balance}", currentUser);
                    notiMessages.Add($"- {stock.Item?.Name ?? request.ItemCode} (+{request.Quantity}) [Job: {request.JobNo}]");
                }
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                if (notiMessages.Any()) await _notiService.SendNotificationAsync(null, "รับของเข้าคลัง", $"คุณ {currentUser} รับของเข้า:\n" + string.Join("\n", notiMessages), "STOCK_IN");
            }
            catch { await transaction.RollbackAsync(); throw; }
        }

        // 📤 3. ขอเบิก (REQ_OUT) - ปรับเงื่อนไข item ต่ำกว่าหรือเท่ากับ 0 จะเบิกไม่ได้เด็ดขาด
        public async Task RequestWithdrawAsync(List<WithdrawRequest> requests)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                string currentUser = GetCurrentUserName();
                var notiMessages = new List<string>();

                foreach (var request in requests)
                {
                    if (request.ItemCode.StartsWith("DRAFT-")) throw new BadRequestException($"อุปกรณ์ ({request.ItemCode}) เป็นรายการรอสั่งซื้อชั่วคราว ยังไม่มีของจริงในคลัง ไม่สามารถเบิกได้");

                    var stock = await _context.StockBalances.Include(s => s.Item).FirstOrDefaultAsync(x => x.ItemCode == request.ItemCode);
                    if (stock == null) throw new NotFoundException($"ไม่พบอุปกรณ์ Code: {request.ItemCode} ในระบบ");

                    // 🎯 ปรับเงื่อนไขใหม่: ถ้าของในสต๊อกหมด (<= 0) หรือมีไม่พอกับจำนวนที่ขอเบิก ให้ดีด Error บล็อกทันที
                    if (stock.Balance <= 0)
                    {
                        throw new BadRequestException($"ไม่สามารถเบิกได้! อุปกรณ์ '{stock.Item?.Name ?? stock.ItemCode}' หมดคลัง (สต๊อกเป็น 0) กรุณาทำเรื่อง 'ขอสั่งซื้อ (PR)' แทน");
                    }

                    if (stock.Balance < request.Quantity)
                    {
                        throw new BadRequestException($"ไม่สามารถเบิกได้! อุปกรณ์ '{stock.Item?.Name ?? stock.ItemCode}' มีไม่พอจ่าย (ต้องการ {request.Quantity} แต่เหลือในคลังแค่ {stock.Balance})");
                    }

                    await _txRepo.AddTransactionAsync(new StockTransaction
                    {
                        TransactionNo = GenerateTransactionNo(),
                        ItemCode = request.ItemCode,
                        Type = "REQ_OUT",
                        Quantity = request.Quantity,
                        BalanceAfter = stock.Balance,
                        JobNo = request.JobNo,
                        Note = request.Note ?? "",
                        CreatedBy = currentUser,
                        CreatedAt = DateTime.Now
                    });

                    notiMessages.Add($"- {stock.Item?.Name ?? request.ItemCode} (ขอเบิก: {request.Quantity}) [Job: {request.JobNo}]");
                }
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                if (notiMessages.Any()) await _notiService.SendNotificationAsync(null, "ทำเรื่องเบิก (รออนุมัติ)", $"คุณ {currentUser} ทำเรื่องเบิก:\n" + string.Join("\n", notiMessages), "STOCK_OUT");
            }
            catch { await transaction.RollbackAsync(); throw; }
        }

        // ✅ 4. อนุมัติเบิก (APPROVE) - หัก Balance (ในตู้) และ TotalQuantity (สมบัติรวม) ณ ตอนนี้เลย
        public async Task ApproveWithdrawAsync(ApproveWithdrawRequest request)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                string currentUser = GetCurrentUserName();

                var pendingTx = await _context.StockTransactions
                    .FirstOrDefaultAsync(t => t.TransactionNo == request.TransactionNo && t.Type == "REQ_OUT");

                if (pendingTx == null) throw new NotFoundException("ไม่พบรายการขอเบิกนี้ หรือถูกอนุมัติ/ยกเลิกไปแล้ว");

                var stock = await _context.StockBalances.Include(s => s.Item).FirstOrDefaultAsync(x => x.ItemCode == pendingTx.ItemCode);
                if (stock == null) throw new Exception("ไม่พบข้อมูลอุปกรณ์ในคลัง");

                // 🚨 เช็ค Stock ก๊อก 2 ณ วินาทีที่กด Approve! เพราะเราไม่ได้จองของไว้ก่อนหน้านี้
                if (stock.Balance < pendingTx.Quantity)
                    throw new BadRequestException($"ไม่สามารถอนุมัติได้! อุปกรณ์ '{stock.Item?.Name}' เหลือในคลังไม่พอให้จ่าย (ต้องการ {pendingTx.Quantity} แต่มีแค่ {stock.Balance})");

                int oldBalance = stock.Balance;
                int oldTotal = stock.TotalQuantity;

                // 🔥 หัก Stock ถาวร ทั้งของในตู้และของทั้งหมดตรงนี้เลย!
                stock.Balance -= pendingTx.Quantity;
                stock.TotalQuantity -= pendingTx.Quantity;
                stock.UpdatedAt = DateTime.Now;

                // เปลี่ยนสถานะบิล
                pendingTx.Type = "OUT";
                pendingTx.BalanceAfter = stock.Balance; // อัปเดตตัวเลขในบิลให้ตรงกับยอดที่ถูกตัดจริงๆ

                string approveNote = $"[อนุมัติโดย {currentUser}]";
                if (!string.IsNullOrEmpty(request.Note)) approveNote += $" {request.Note}";

                if (string.IsNullOrEmpty(pendingTx.Note)) pendingTx.Note = approveNote;
                else pendingTx.Note += $" | {approveNote}";

                await _logRepo.AddLogAsync("APPROVE_OUT", "StockBalances", stock.ItemCode, $"Bal: {oldBalance}, Tot: {oldTotal}", $"Bal: {stock.Balance}, Tot: {stock.TotalQuantity}", currentUser);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                await _notiService.SendNotificationAsync(null, "อนุมัติและจ่ายอุปกรณ์", $"อนุมัติจ่าย '{stock.Item?.Name ?? stock.ItemCode}' จำนวน {pendingTx.Quantity} ชิ้น ให้ Job: {pendingTx.JobNo} แล้ว", "STOCK_OUT");
            }
            catch { await transaction.RollbackAsync(); throw; }
        }

        // 🗑️ 5. ตัดรายการใบคำขอซื้อ (WRITE_OFF) - ยกเลิกใบขอซื้อตัวที่หาไม่ได้ ไม่ยุ่งกับยอด Stock ในคลังเด็ดขาด!
        public async Task WriteOffStockAsync(WriteOffRequest request)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                string currentUser = GetCurrentUserName();
                var stock = await _context.StockBalances.Include(s => s.Item).FirstOrDefaultAsync(x => x.ItemCode == request.ItemCode);
                if (stock == null) throw new Exception($"ไม่พบอุปกรณ์ Code: {request.ItemCode}");

                // 🎯 เช็คยอดคำขอซื้อของเก่าที่มีอยู่จริงก่อนตัด
                var prQty = await _context.StockTransactions
                    .Where(t => t.JobNo == request.JobNo && t.ItemCode == request.ItemCode && t.Type == "PR")
                    .SumAsync(t => t.Quantity);

                var alreadyFilled = await _context.StockTransactions
                    .Where(t => t.JobNo == request.JobNo && t.ItemCode == request.ItemCode && (t.Type == "IN" || t.Type == "WRITE_OFF"))
                    .SumAsync(t => t.Quantity);

                int prDeficit = prQty - alreadyFilled;

                if (request.Quantity > prDeficit)
                    throw new BadRequestException($"ไม่สามารถตัดรายการได้เกินยอดใบขอซื้อที่ค้างอยู่ (Job นี้ค้างใบขอซื้ออยู่: {prDeficit} ชิ้น)");

                // 💡 [แก้ไขแล้ว] บันทึกบิลยกเลิกใบคำขอซื้อเท่านั้น ไม่มีการลดยอด stock.Balance หรือ stock.TotalQuantity ทั้งสิ้น!
                await _txRepo.AddTransactionAsync(new StockTransaction
                {
                    TransactionNo = GenerateTransactionNo(),
                    ItemCode = request.ItemCode,
                    Type = "WRITE_OFF", // บันทึกสิทธิ์การยกเลิกคำขอซื้อ
                    Quantity = request.Quantity,
                    BalanceAfter = stock.Balance, // ยอดในตู้เท่าเดิมเป๊ะ
                    JobNo = request.JobNo,
                    Note = $"[ตัดใบคำขอซื้อ - ซื้อตามตลาดไม่ได้] {request.Note}",
                    CreatedBy = currentUser, // เก็บชื่อผู้ทำรายการตัด ณ ตอนนี้
                    CreatedAt = DateTime.Now
                });

                await _logRepo.AddLogAsync("CANCEL_PR", "StockBalances", request.ItemCode, $"Stock มั่นคงเท่าเดิม", $"ตัดใบขอซื้อ Job: {request.JobNo} จำนวน {request.Quantity} ชิ้น", currentUser);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch { await transaction.RollbackAsync(); throw; }
        }

        // 📋 6.1 ดึงข้อมูลรายการรอสั่งซื้อ (PR) - คำนวณหักลบสะสม (จะหายไปเมื่อกด Receive หรือ Write-off ครบจำนวน)
        public async Task<List<PendingWithdrawalDto>> GetPurchaseRequestsAsync()
        {
            var transactions = await _context.StockTransactions
                .Include(t => t.Item)
                .Where(t => !string.IsNullOrEmpty(t.JobNo) && (t.Type == "PR" || t.Type == "IN" || t.Type == "WRITE_OFF"))
                .ToListAsync();

            // จัดกลุ่มคำนวณหา Net Remaining ของใบขอซื้อ
            var grouped = transactions
                .GroupBy(t => new { t.JobNo, t.ItemCode })
                .Select(g => {
                    int requested = g.Where(x => x.Type == "PR").Sum(x => x.Quantity);
                    int received = g.Where(x => x.Type == "IN").Sum(x => x.Quantity);
                    int writtenOff = g.Where(x => x.Type == "WRITE_OFF").Sum(x => x.Quantity);
                    int netPending = requested - received - writtenOff; // 🎯 ยอดคำขอซื้อที่ยังค้างจริง

                    return new PendingWithdrawalDto
                    {
                        TransactionNo = g.Where(x => x.Type == "PR").Select(x => x.TransactionNo).FirstOrDefault() ?? "-",
                        ItemCode = g.Key.ItemCode,
                        ItemName = g.First().Item?.Name ?? "Unknown",
                        JobNo = g.Key.JobNo,
                        Type = "PR",
                        PendingAmount = netPending,
                        LastUpdated = g.Max(x => x.CreatedAt).ToString("dd/MM/yyyy HH:mm:ss"),
                        RecordedBy = g.Where(x => x.Type == "PR").OrderBy(x => x.CreatedAt).Select(x => x.CreatedBy).FirstOrDefault() ?? "-"
                    };
                })
                .Where(x => x.PendingAmount > 0) // 🔥 ถ้าได้ของครบ หรือโดนตัดทิ้งจนเหลือ 0 รายการจะหายไปจากลิสต์ทันที!
                .OrderByDescending(x => x.LastUpdated)
                .ToList();

            return grouped;
        }

        // 📋 6.2 ดึงข้อมูลรายการรออนุมัติเบิก (REQ_OUT) - แสดงผลแบบ 1 คำขอ 1 บรรทัด (หายไปเมื่อกด Approve จ่ายของ)
        public async Task<List<PendingWithdrawalDto>> GetPendingWithdrawalsAsync()
        {
            var transactions = await _context.StockTransactions
                .Include(t => t.Item)
                .Where(t => t.Type == "REQ_OUT") // รออนุมัติ
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            return transactions.Select(t => new PendingWithdrawalDto
            {
                TransactionNo = t.TransactionNo,
                ItemCode = t.ItemCode,
                ItemName = t.Item != null ? t.Item.Name : "Unknown",
                JobNo = t.JobNo ?? "-",
                Type = "REQ_OUT",
                PendingAmount = t.Quantity,
                LastUpdated = t.CreatedAt.ToString("dd/MM/yyyy HH:mm:ss"),
                RecordedBy = t.CreatedBy ?? "-"
            }).ToList();
        }

        // 📋 7. ดึงข้อมูลประวัติตัดจำหน่ายคำขอซื้อ (Write-off Summary) - แสดงชื่อคนตัดรายการชัดเจน
        public async Task<List<WriteOffSummaryDto>> GetWriteOffSummaryAsync()
        {
            var transactions = await _context.StockTransactions
                .Include(t => t.Item)
                .Where(t => t.Type == "WRITE_OFF")
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            var jobNos = transactions.Select(t => t.JobNo).Distinct().ToList();
            var itemCodes = transactions.Select(t => t.ItemCode).Distinct().ToList();

            // ค้นหาว่าใครเป็นคนส่งใบขอซื้อ (PR) คนแรกของกลุ่ม Job นี้นำมาเป็นคนขอเบิกต้นทาง
            var originalPRs = await _context.StockTransactions
                .Where(t => t.Type == "PR" && jobNos.Contains(t.JobNo) && itemCodes.Contains(t.ItemCode))
                .GroupBy(t => new { t.JobNo, t.ItemCode })
                .Select(g => new { Key = g.Key.JobNo + "_" + g.Key.ItemCode, User = g.OrderBy(x => x.CreatedAt).Select(x => x.CreatedBy).FirstOrDefault() })
                .ToDictionaryAsync(x => x.Key, x => x.User ?? "-");

            return transactions.Select(t => new WriteOffSummaryDto
            {
                TransactionNo = t.TransactionNo,
                ItemCode = t.ItemCode,
                ItemName = t.Item != null ? t.Item.Name : "Unknown",
                Category = t.Item != null ? t.Item.Category : "-",
                JobNo = t.JobNo ?? "-",
                TotalWriteOff = t.Quantity,
                LastWriteOffDate = t.CreatedAt.ToString("dd/MM/yyyy HH:mm:ss"),
                ActionBy = t.CreatedBy ?? "-", // 🔥 [แก้ไขแล้ว] คนทำรายการตัดใบคำขอ ณ ตอนนั้น
                RecordedBy = originalPRs.ContainsKey($"{t.JobNo}_{t.ItemCode}") ? originalPRs[$"{t.JobNo}_{t.ItemCode}"] : "-" // คนยื่นขอซื้อคนแรก
            }).ToList();
        }

        // 📋 ดึงประวัติการขอซื้อทั้งหมด พร้อมระบุผู้กดรับของ
        public async Task<List<PurchaseHistoryDto>> GetPurchaseHistoryAsync()
        {
            var prTransactions = await _context.StockTransactions
                .Include(t => t.Item)
                .Where(t => t.Type == "PR")
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            var jobNos = prTransactions.Select(t => t.JobNo).Distinct().ToList();
            var itemCodes = prTransactions.Select(t => t.ItemCode).Distinct().ToList();

            // 🔍 ไปค้นหาว่าบิลรับเข้า (IN) ของคู่ Job + Item นี้ ใครเป็นคนกดเซฟ (CreatedBy)
            var receiversDict = await _context.StockTransactions
                .Where(t => t.Type == "IN" && jobNos.Contains(t.JobNo) && itemCodes.Contains(t.ItemCode))
                .GroupBy(t => new { t.JobNo, t.ItemCode })
                .ToDictionaryAsync(
                    g => $"{g.Key.JobNo}_{g.Key.ItemCode}",
                    g => g.OrderByDescending(x => x.CreatedAt).Select(x => x.CreatedBy).FirstOrDefault() ?? "-"
                );

            return prTransactions.Select(t => new PurchaseHistoryDto
            {
                TransactionNo = t.TransactionNo,
                ItemCode = t.ItemCode,
                ItemName = t.Item != null ? t.Item.Name : "Unknown",
                JobNo = t.JobNo ?? "-",
                Quantity = t.Quantity,
                Note = t.Note ?? "",
                CreatedBy = t.CreatedBy ?? "System",
                ReceivedBy = receiversDict.ContainsKey($"{t.JobNo}_{t.ItemCode}") ? receiversDict[$"{t.JobNo}_{t.ItemCode}"] : "-", // 🔥 ดึงชื่อคนกดรับของจากตาราง IN มาโชว์
                CreatedAt = t.CreatedAt.ToString("dd/MM/yyyy HH:mm:ss")
            }).ToList();
        }

        // 📋 ดึงประวัติการเบิกออกทั้งหมด พร้อมระบุผู้อนุมัติจ่ายของ
        public async Task<List<WithdrawHistoryDto>> GetWithdrawHistoryAsync()
        {
            var transactions = await _context.StockTransactions
                .Include(t => t.Item)
                .Where(t => t.Type == "REQ_OUT" || t.Type == "OUT")
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            return transactions.Select(t => {
                string approvedBy = "-";

                // 🔍 ถ้ารายการอนุมัติแล้ว (Type == "OUT") ให้ทำการแกะ String ชื่อผู้อนุมัติออกจากช่อง Note
                if (t.Type == "OUT" && !string.IsNullOrEmpty(t.Note) && t.Note.Contains("[อนุมัติโดย "))
                {
                    try
                    {
                        int start = t.Note.IndexOf("[อนุมัติโดย ") + "[อนุมัติโดย ".Length;
                        int end = t.Note.IndexOf("]", start);
                        if (end > start)
                        {
                            approvedBy = t.Note.Substring(start, end - start);
                        }
                    }
                    catch { approvedBy = "Unknown"; }
                }

                return new WithdrawHistoryDto
                {
                    TransactionNo = t.TransactionNo,
                    ItemCode = t.ItemCode,
                    ItemName = t.Item != null ? t.Item.Name : "Unknown",
                    JobNo = t.JobNo ?? "-",
                    Quantity = t.Quantity,
                    Status = t.Type == "OUT" ? "จ่ายของแล้ว" : "รออนุมัติ",
                    Note = t.Note ?? "",
                    CreatedBy = t.CreatedBy ?? "System",
                    ApprovedBy = approvedBy, // 🔥 ส่งชื่อผู้อนุมัติกลับไปแสดงที่ตารางประวัติบนหน้าเว็บ
                    CreatedAt = t.CreatedAt.ToString("dd/MM/yyyy HH:mm:ss")
                };
            }).ToList();
        }

        // ❌ ยกเลิกใบขอซื้อ (ดักตรวจสอบการรับของแล้ว)
        public async Task CancelPurchaseRequestAsync(CancelRequestDto request)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                string currentUser = GetCurrentUserName();

                var prTx = await _context.StockTransactions
                    .FirstOrDefaultAsync(t => t.TransactionNo == request.TransactionNo && t.Type == "PR");

                if (prTx == null) throw new NotFoundException("ไม่พบรายการขอซื้อนี้ หรือรายการถูกยกเลิกไปแล้ว");

                // 🚨 กำแพงเหล็ก: ตรวจสอบว่ามีการกดรับของ (IN) หรือกดตัดรายการ (WRITE_OFF) ไปบ้างหรือยัง
                var actedQty = await _context.StockTransactions
                    .Where(t => t.JobNo == prTx.JobNo && t.ItemCode == prTx.ItemCode && (t.Type == "IN" || t.Type == "WRITE_OFF"))
                    .SumAsync(t => t.Quantity);

                if (actedQty > 0)
                {
                    // ถ้ามีการทำรายการไปแล้วแม้แต่ชิ้นเดียว ดีดออกทันที!
                    throw new BadRequestException("ไม่สามารถยกเลิกได้! เนื่องจากใบขอซื้อนี้มีการรับของเข้าคลัง หรือถูกตัดรายการไปแล้วบางส่วน");
                }

                // 🎯 ถ้ารอดมาได้ ค่อยบันทึกสถานะยกเลิก
                prTx.Type = "CANCEL_PR";
                string cancelNote = $"[ยกเลิกโดย {currentUser}] เหตุผล: {request.Note}";

                if (string.IsNullOrEmpty(prTx.Note)) prTx.Note = cancelNote;
                else prTx.Note += $" | {cancelNote}";

                await _logRepo.AddLogAsync("CANCEL_PR", "StockTransactions", prTx.ItemCode, "Type: PR", $"ยกเลิกใบขอซื้อ Job: {prTx.JobNo} โดย {currentUser}", currentUser);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                await _notiService.SendNotificationAsync(null, "ยกเลิกใบขอสั่งซื้อ", $"ใบขอสั่งซื้อเลขที่ '{request.TransactionNo}' ถูกยกเลิกโดยคุณ {currentUser}", "STOCK_PR");
            }
            catch { await transaction.RollbackAsync(); throw; }
        }

        // ❌ ยกเลิกใบขอเบิก (เปลี่ยน Type จาก REQ_OUT -> CANCEL_OUT)
        public async Task CancelWithdrawRequestAsync(CancelRequestDto request)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                string currentUser = GetCurrentUserName();

                // ค้นหาใบขอเบิกที่ค้างรออนุมัติอยู่
                var pendingTx = await _context.StockTransactions
                    .FirstOrDefaultAsync(t => t.TransactionNo == request.TransactionNo && t.Type == "REQ_OUT");

                if (pendingTx == null) throw new NotFoundException("ไม่พบรายการขอเบิกนี้ หรือรายการถูกอนุมัติ/ยกเลิกไปแล้ว");

                // 🎯 บันทึกสถานะใหม่เป็นยกเลิกคำขอ (ไม่ต้องคืนยอดสต๊อก เพราะตอนขอเบิกเรายังไม่ได้หักออก)
                pendingTx.Type = "CANCEL_OUT";
                string cancelNote = $"[ยกเลิกโดย {currentUser}] เหตุผล: {request.Note}";

                if (string.IsNullOrEmpty(pendingTx.Note)) pendingTx.Note = cancelNote;
                else pendingTx.Note += $" | {cancelNote}";

                // บันทึกระบบ Log ประวัติระบบ
                await _logRepo.AddLogAsync("CANCEL_OUT", "StockTransactions", pendingTx.ItemCode, "Type: REQ_OUT", $"ยกเลิกใบขอเบิก Job: {pendingTx.JobNo} โดย {currentUser}", currentUser);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                await _notiService.SendNotificationAsync(null, "ยกเลิกใบขอเบิกอุปกรณ์", $"ใบขอเบิกเลขที่ '{request.TransactionNo}' ถูกยกเลิกโดยคุณ {currentUser}", "STOCK_OUT");
            }
            catch { await transaction.RollbackAsync(); throw; }
        }

        // 📋 GET: ดึงรายการใบขอซื้อที่ถูกยกเลิก (พร้อมระบุคนยกเลิก)
        public async Task<List<PurchaseHistoryDto>> GetCanceledPurchaseRequestsAsync()
        {
            var transactions = await _context.StockTransactions
                .Include(t => t.Item)
                .Where(t => t.Type == "CANCEL_PR")
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            return transactions.Select(t => {
                string canceledBy = "-";

                // 🔍 แกะชื่อผู้ยกเลิกออกจาก Note
                if (!string.IsNullOrEmpty(t.Note) && t.Note.Contains("[ยกเลิกโดย "))
                {
                    try
                    {
                        int start = t.Note.IndexOf("[ยกเลิกโดย ") + "[ยกเลิกโดย ".Length;
                        int end = t.Note.IndexOf("]", start);
                        if (end > start) canceledBy = t.Note.Substring(start, end - start);
                    }
                    catch { canceledBy = "Unknown"; }
                }

                return new PurchaseHistoryDto
                {
                    TransactionNo = t.TransactionNo,
                    ItemCode = t.ItemCode,
                    ItemName = t.Item != null ? t.Item.Name : "Unknown",
                    JobNo = t.JobNo ?? "-",
                    Quantity = t.Quantity,
                    Note = t.Note ?? "",
                    CreatedBy = t.CreatedBy ?? "System", // คนขอซื้อคนแรก
                    ReceivedBy = "-",
                    CanceledBy = canceledBy, // 🔥 ส่งชื่อคนยกเลิกกลับไป
                    CreatedAt = t.CreatedAt.ToString("dd/MM/yyyy HH:mm:ss")
                };
            }).ToList();
        }

        // 📋 GET: ดึงรายการใบขอเบิกที่ถูกยกเลิก (พร้อมระบุคนยกเลิก)
        public async Task<List<WithdrawHistoryDto>> GetCanceledWithdrawRequestsAsync()
        {
            var transactions = await _context.StockTransactions
                .Include(t => t.Item)
                .Where(t => t.Type == "CANCEL_OUT")
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            return transactions.Select(t => {
                string canceledBy = "-";

                // 🔍 แกะชื่อผู้ยกเลิกออกจาก Note
                if (!string.IsNullOrEmpty(t.Note) && t.Note.Contains("[ยกเลิกโดย "))
                {
                    try
                    {
                        int start = t.Note.IndexOf("[ยกเลิกโดย ") + "[ยกเลิกโดย ".Length;
                        int end = t.Note.IndexOf("]", start);
                        if (end > start) canceledBy = t.Note.Substring(start, end - start);
                    }
                    catch { canceledBy = "Unknown"; }
                }

                return new WithdrawHistoryDto
                {
                    TransactionNo = t.TransactionNo,
                    ItemCode = t.ItemCode,
                    ItemName = t.Item != null ? t.Item.Name : "Unknown",
                    JobNo = t.JobNo ?? "-",
                    Quantity = t.Quantity,
                    Status = "ยกเลิกคำขอ",
                    Note = t.Note ?? "",
                    CreatedBy = t.CreatedBy ?? "System", // คนส่งเรื่องขอเบิกคนแรก
                    ApprovedBy = "-",
                    CanceledBy = canceledBy, // 🔥 ส่งชื่อคนยกเลิกกลับไป
                    CreatedAt = t.CreatedAt.ToString("dd/MM/yyyy HH:mm:ss")
                };
            }).ToList();
        }
    }
}