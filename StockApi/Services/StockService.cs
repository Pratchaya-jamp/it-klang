using Microsoft.EntityFrameworkCore;
using StockApi.Config;
using StockApi.Dtos;
using StockApi.Entities;
using StockApi.Repositories;
using Microsoft.AspNetCore.Http;

namespace StockApi.Services
{
    public interface IStockService
    {
        Task<List<StockBalanceDto>> GetStockOverviewAsync(string? searchId, string? category, string? keyword, string? variant);

        Task ReceiveStockAsync(List<TransactionRequest> requests);
        Task WithdrawStockAsync(List<TransactionRequest> requests);

        // 🔥 เพิ่ม Interface สำหรับ Write-Off
        Task WriteOffStockAsync(WriteOffRequest request);
        Task<List<WriteOffSummaryDto>> GetWriteOffSummaryAsync();

        Task<List<PendingWithdrawalDto>> GetPendingWithdrawalsAsync();
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

        public async Task<List<StockBalanceDto>> GetStockOverviewAsync(string? searchId, string? category, string? keyword, string? variant)
        {
            var data = await _repo.GetStockBalancesAsync(searchId, category, keyword, variant);
            var today = DateTime.Now.Date;
            var itemCodes = data.Select(x => x.ItemCode).ToList();

            var borrowedData = await _context.BorrowTransactions
                .Where(b => itemCodes.Contains(b.ItemCode) && b.Status == "Borrowed")
                .GroupBy(b => b.ItemCode)
                .Select(g => new
                {
                    ItemCode = g.Key,
                    TotalBorrowed = g.Sum(x => x.Quantity)
                })
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
            var name = _httpContextAccessor.HttpContext?.User?.FindFirst("name")?.Value;
            return name ?? "System";
        }

        public async Task ReceiveStockAsync(List<TransactionRequest> requests)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                string currentUser = GetCurrentUserName();
                var notiMessages = new List<string>();

                foreach (var request in requests)
                {
                    var stock = await _context.StockBalances.FirstOrDefaultAsync(x => x.ItemCode == request.ItemCode);
                    if (stock == null) throw new Exception($"ไม่พบอุปกรณ์ Code: {request.ItemCode}");

                    int oldBalance = stock.Balance;

                    var today = DateTime.Now.Date;
                    if (stock.LastReceivedDate.Date < today) stock.Received = request.Quantity;
                    else stock.Received += request.Quantity;
                    stock.LastReceivedDate = DateTime.Now;

                    stock.Balance += request.Quantity;

                    int amountToFillHole = 0;
                    int amountExpansion = 0;

                    var jobOut = await _context.StockTransactions
                        .Where(t => t.JobNo == request.JobNo && t.ItemCode == request.ItemCode && t.Type == "OUT")
                        .SumAsync(t => t.Quantity);

                    // 🔥 ต้องนับยอด WRITE_OFF รวมเข้าไปว่าเป็น "การคืน" รูปแบบนึงด้วย หนี้จะได้ลด
                    var jobIn = await _context.StockTransactions
                        .Where(t => t.JobNo == request.JobNo && t.ItemCode == request.ItemCode && (t.Type == "IN" || t.Type == "WRITE_OFF"))
                        .SumAsync(t => t.Quantity);

                    int jobDeficit = jobOut - jobIn;

                    if (jobDeficit > 0)
                    {
                        amountToFillHole = Math.Min(jobDeficit, request.Quantity);
                        if (stock.TempWithdrawn < amountToFillHole) amountToFillHole = stock.TempWithdrawn;

                        stock.TempWithdrawn -= amountToFillHole;
                        amountExpansion = request.Quantity - amountToFillHole;
                    }
                    else
                    {
                        amountExpansion = request.Quantity;
                    }

                    stock.TotalQuantity += amountExpansion;
                    stock.UpdatedAt = DateTime.Now;

                    await _txRepo.AddTransactionAsync(new StockTransaction
                    {
                        TransactionNo = GenerateTransactionNo(),
                        ItemCode = request.ItemCode,
                        Type = "IN",
                        Quantity = request.Quantity,
                        BalanceAfter = stock.Balance,
                        JobNo = request.JobNo,
                        Note = request.Note,
                        CreatedBy = currentUser,
                        CreatedAt = DateTime.Now
                    });

                    string packData = $"Balance: {stock.Balance}|Withdraw:+0|Receive:+{request.Quantity}";
                    await _logRepo.AddLogAsync(
                        $"STOCK_IN (+{request.Quantity}) [Job: {request.JobNo}]",
                        "StockBalances", request.ItemCode, $"Balance: {oldBalance}", packData, currentUser);

                    notiMessages.Add($"- {stock.Item?.Name ?? request.ItemCode} (+{request.Quantity}) [Job: {request.JobNo}]");
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                if (notiMessages.Any())
                {
                    await _notiService.SendNotificationAsync(null, "รับของเข้าคลัง", $"คุณ {currentUser} รับของเข้าคลัง:\n" + string.Join("\n", notiMessages), "STOCK_IN");
                }
            }
            catch { await transaction.RollbackAsync(); throw; }
        }

        public async Task WithdrawStockAsync(List<TransactionRequest> requests)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                string currentUser = GetCurrentUserName();
                var notiMessages = new List<string>();

                foreach (var request in requests)
                {
                    var stock = await _context.StockBalances.FirstOrDefaultAsync(x => x.ItemCode == request.ItemCode);
                    if (stock == null) throw new Exception($"ไม่พบอุปกรณ์ Code: {request.ItemCode}");
                    if (stock.Balance < request.Quantity) throw new Exception($"อุปกรณ์ {stock.ItemCode} ไม่พอเบิก (ขอ {request.Quantity} มี {stock.Balance})");

                    int oldBalance = stock.Balance;

                    stock.Balance -= request.Quantity;
                    stock.TempWithdrawn += request.Quantity;
                    stock.UpdatedAt = DateTime.Now;

                    await _txRepo.AddTransactionAsync(new StockTransaction
                    {
                        TransactionNo = GenerateTransactionNo(),
                        ItemCode = request.ItemCode,
                        Type = "OUT",
                        Quantity = request.Quantity,
                        BalanceAfter = stock.Balance,
                        JobNo = request.JobNo,
                        Note = request.Note,
                        CreatedBy = currentUser,
                        CreatedAt = DateTime.Now
                    });

                    string packData = $"Balance: {stock.Balance}|Withdraw:-{request.Quantity}|Receive:+0";
                    await _logRepo.AddLogAsync($"STOCK_OUT (-{request.Quantity}) [Job: {request.JobNo}]", "StockBalances", request.ItemCode, $"Balance: {oldBalance}", packData, currentUser);

                    notiMessages.Add($"- {stock.Item?.Name ?? request.ItemCode} (-{request.Quantity}) [Job: {request.JobNo}]");
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                if (notiMessages.Any())
                {
                    await _notiService.SendNotificationAsync(null, "เบิกของออก", $"คุณ {currentUser} เบิกของออก:\n" + string.Join("\n", notiMessages), "STOCK_OUT");
                }
            }
            catch { await transaction.RollbackAsync(); throw; }
        }

        // 🔥 3. ฟังก์ชัน Write-Off ตัดจำหน่ายของที่หาคืนไม่ได้
        public async Task WriteOffStockAsync(WriteOffRequest request)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                string currentUser = GetCurrentUserName();

                var stock = await _context.StockBalances
                    .Include(s => s.Item)
                    .FirstOrDefaultAsync(x => x.ItemCode == request.ItemCode);

                if (stock == null) throw new Exception($"ไม่พบอุปกรณ์ Code: {request.ItemCode}");

                int oldTotal = stock.TotalQuantity;
                int oldTemp = stock.TempWithdrawn;

                var jobOut = await _context.StockTransactions
                    .Where(t => t.JobNo == request.JobNo && t.ItemCode == request.ItemCode && t.Type == "OUT")
                    .SumAsync(t => t.Quantity);

                var jobIn = await _context.StockTransactions
                    .Where(t => t.JobNo == request.JobNo && t.ItemCode == request.ItemCode && (t.Type == "IN" || t.Type == "WRITE_OFF"))
                    .SumAsync(t => t.Quantity);

                int jobDeficit = jobOut - jobIn;

                if (request.Quantity > jobDeficit)
                    throw new Exception($"ไม่สามารถตัดจำหน่ายได้เกินกว่ายอดที่ค้างอยู่ (Job นี้ค้างอยู่: {jobDeficit} ชิ้น)");

                if (request.Quantity > stock.TempWithdrawn)
                    throw new Exception("ยอดเบิกชั่วคราว (TempWithdrawn) ในระบบไม่เพียงพอให้ตัดยอด");

                // ลดยอดเบิก (ล้างหนี้) และ ลด TotalQuantity (ของหายไปจากคลัง) ส่วน Balance เท่าเดิม
                stock.TempWithdrawn -= request.Quantity;
                stock.TotalQuantity -= request.Quantity;
                stock.UpdatedAt = DateTime.Now;

                _context.StockBalances.Update(stock);

                await _txRepo.AddTransactionAsync(new StockTransaction
                {
                    TransactionNo = GenerateTransactionNo(),
                    ItemCode = request.ItemCode,
                    Type = "WRITE_OFF",
                    Quantity = request.Quantity,
                    BalanceAfter = stock.Balance,
                    JobNo = request.JobNo,
                    Note = $"[ตัดจำหน่าย] {request.Note}",
                    CreatedBy = currentUser,
                    CreatedAt = DateTime.Now
                });

                string logDetail = $"TotalQty: {oldTotal} -> {stock.TotalQuantity} | TempWithdrawn: {oldTemp} -> {stock.TempWithdrawn} | Job: {request.JobNo} | Reason: {request.Note}";
                await _logRepo.AddLogAsync("WRITE_OFF", "StockBalances", request.ItemCode, $"TotalQty: {oldTotal}", logDetail, currentUser);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                await _notiService.SendNotificationAsync(
                    null,
                    "ตัดจำหน่ายอุปกรณ์ (Write-Off)",
                    $"คุณ {currentUser} ตัดจำหน่าย '{stock.Item?.Name ?? request.ItemCode}' จำนวน {request.Quantity} ชิ้น (Job: {request.JobNo})\nเหตุผล: {request.Note}",
                    "STOCK_WRITEOFF"
                );
            }
            catch { await transaction.RollbackAsync(); throw; }
        }

        public async Task<List<WriteOffSummaryDto>> GetWriteOffSummaryAsync()
        {
            // 1. ดึงประวัติเฉพาะ Type "WRITE_OFF" แล้วจัดกลุ่มตาม ItemCode เพื่อรวมยอด
            var writeOffStats = await _context.StockTransactions
                .Where(t => t.Type == "WRITE_OFF")
                .GroupBy(t => t.ItemCode)
                .Select(g => new
                {
                    ItemCode = g.Key,
                    TotalWriteOff = g.Sum(x => x.Quantity),
                    LastDate = g.Max(x => x.CreatedAt) // หาวันที่ตัดทิ้งล่าสุด
                })
                .ToListAsync();

            if (!writeOffStats.Any()) return new List<WriteOffSummaryDto>();

            // 2. ดึงชื่ออุปกรณ์และหมวดหมู่จากตาราง Items มาผูก
            var itemCodes = writeOffStats.Select(x => x.ItemCode).ToList();
            var itemsDict = await _context.Items
                .Where(i => itemCodes.Contains(i.ItemCode))
                .ToDictionaryAsync(i => i.ItemCode, i => new { i.Name, i.Category });

            // 3. ประกอบร่างส่งกลับไปให้หน้าบ้าน
            return writeOffStats.Select(x => new WriteOffSummaryDto
            {
                ItemCode = x.ItemCode,
                ItemName = itemsDict.ContainsKey(x.ItemCode) ? itemsDict[x.ItemCode].Name : "Unknown",
                Category = itemsDict.ContainsKey(x.ItemCode) ? itemsDict[x.ItemCode].Category : "-",

                TotalWriteOff = x.TotalWriteOff,
                LastWriteOffDate = x.LastDate.ToString("dd/MM/yyyy HH:mm:ss")
            })
            // เรียงลำดับจากรายการที่เพิ่งถูกตัดทิ้งล่าสุดขึ้นก่อน
            .OrderByDescending(x => x.LastWriteOffDate)
            .ToList();
        }

        public async Task<List<PendingWithdrawalDto>> GetPendingWithdrawalsAsync()
        {
            var groupedTransactions = await _context.StockTransactions
                .Where(t => !string.IsNullOrEmpty(t.JobNo))
                .GroupBy(t => new { t.JobNo, t.ItemCode })
                .Select(g => new
                {
                    JobNo = g.Key.JobNo,
                    ItemCode = g.Key.ItemCode,
                    Withdrawn = g.Where(x => x.Type == "OUT").Sum(x => x.Quantity),

                    // 🔥 แก้ตรงนี้: ถือว่าการ WRITE_OFF คือการเคลียร์ยอด (Returned) รูปแบบหนึ่ง
                    Returned = g.Where(x => x.Type == "IN" || x.Type == "WRITE_OFF").Sum(x => x.Quantity),

                    LastTransactionDate = g.Max(x => x.CreatedAt)
                })
                .Where(x => (x.Withdrawn - x.Returned) > 0)
                .ToListAsync();

            var itemCodes = groupedTransactions.Select(t => t.ItemCode).Distinct().ToList();
            var itemsDict = await _context.StockBalances
                .Include(b => b.Item)
                .Where(b => itemCodes.Contains(b.ItemCode))
                .ToDictionaryAsync(b => b.ItemCode, b => b.Item?.Name ?? "Unknown");

            var pendingList = groupedTransactions.Select(t => new PendingWithdrawalDto
            {
                JobNo = t.JobNo,
                ItemCode = t.ItemCode,
                ItemName = itemsDict.ContainsKey(t.ItemCode) ? itemsDict[t.ItemCode] : "Unknown",
                PendingAmount = t.Withdrawn - t.Returned,
                LastUpdated = t.LastTransactionDate.ToString("dd/MM/yyyy HH:mm:ss")
            })
            .OrderByDescending(x => x.LastUpdated)
            .ToList();

            return pendingList;
        }

        private string GenerateTransactionNo()
        {
            return $"TRX-{DateTime.Now:yyyyMMdd}-{Guid.NewGuid().ToString().Substring(0, 5).ToUpper()}";
        }
    }
}