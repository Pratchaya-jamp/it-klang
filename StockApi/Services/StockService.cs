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

        // 📝 1. ขอซื้อ (PR) - ไม่กระทบสต๊อก
        public async Task RequestPurchaseAsync(List<PurchaseRequestDto> requests)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                string currentUser = GetCurrentUserName();
                var notiMessages = new List<string>();

                foreach (var request in requests)
                {
                    var stock = await _context.StockBalances.Include(s => s.Item).FirstOrDefaultAsync(x => x.ItemCode == request.ItemCode);
                    if (stock == null) throw new NotFoundException($"ไม่พบอุปกรณ์ Code: {request.ItemCode}");

                    await _txRepo.AddTransactionAsync(new StockTransaction
                    {
                        TransactionNo = GenerateTransactionNo(),
                        ItemCode = request.ItemCode,
                        Type = "PR",
                        Quantity = request.Quantity,
                        BalanceAfter = stock.Balance,
                        JobNo = request.JobNo,
                        Note = $"[ขอซื้อ] {request.Note}",
                        CreatedBy = currentUser,
                        CreatedAt = DateTime.Now
                    });

                    notiMessages.Add($"- 🛒 ขอซื้อ {stock.Item?.Name ?? request.ItemCode} จำนวน {request.Quantity} ชิ้น [Job: {request.JobNo}]");
                }
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                if (notiMessages.Any()) await _notiService.SendNotificationAsync(null, "แจ้งขอสั่งซื้ออุปกรณ์", $"คุณ {currentUser} ทำเรื่องขอสั่งซื้อ:\n" + string.Join("\n", notiMessages), "STOCK_PR");
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

        // 📤 3. ขอเบิก (REQ_OUT) - แค่สร้างใบขอเบิก ยังไม่หัก Stock ใดๆ ทั้งสิ้น
        public async Task RequestWithdrawAsync(List<WithdrawRequest> requests)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                string currentUser = GetCurrentUserName();
                var notiMessages = new List<string>();

                foreach (var request in requests)
                {
                    if (request.ItemCode.StartsWith("DRAFT-")) throw new BadRequestException($"อุปกรณ์ ({request.ItemCode}) ยังไม่มีรหัสจริง เบิกไม่ได้");
                    var stock = await _context.StockBalances.Include(s => s.Item).FirstOrDefaultAsync(x => x.ItemCode == request.ItemCode);
                    if (stock == null) throw new Exception($"ไม่พบอุปกรณ์ Code: {request.ItemCode}");

                    // เช็คแค่ว่า "ณ ตอนที่ทำเรื่อง" มีของพอไหม (แต่ไม่ได้ตัดยอดนะ)
                    if (stock.Balance < request.Quantity)
                        throw new BadRequestException($"อุปกรณ์ '{stock.Item?.Name ?? stock.ItemCode}' ไม่พอเบิก (ขอ {request.Quantity} มี {stock.Balance}) กรุณาทำเรื่อง 'ขอสั่งซื้อ (PR)' แทน");

                    // 🔥 ไม่มีการหัก stock.Balance หรือบวก stock.TempWithdrawn ตรงนี้แล้ว! 
                    // บันทึกแค่ใบ Transaction ไว้เป็นหลักฐานรออนุมัติ

                    await _txRepo.AddTransactionAsync(new StockTransaction
                    {
                        TransactionNo = GenerateTransactionNo(),
                        ItemCode = request.ItemCode,
                        Type = "REQ_OUT",
                        Quantity = request.Quantity,
                        BalanceAfter = stock.Balance, // ยอดคงเหลือยังเท่าเดิม
                        JobNo = request.JobNo,
                        Note = request.Note,
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
    }
}