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
        Task<List<PendingWithdrawalDto>> GetPendingWithdrawalsAsync();
    }

    public class StockService : IStockService
    {
        private readonly IStockRepository _repo;
        private readonly ITransactionRepository _txRepo; // เพิ่มตัวนี้
        private readonly ISystemLogRepository _logRepo;
        private readonly AppDbContext _context;          // เพิ่มตัวนี้
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly INotificationService _notiService;

        // Constructor ต้องรับค่าเข้ามาให้ครบ 3 ตัว
        public StockService(IStockRepository repo, ITransactionRepository txRepo, ISystemLogRepository logRepo, AppDbContext context, IHttpContextAccessor httpContextAccessor, INotificationService notiService)
        {
            _repo = repo;
            _txRepo = txRepo;
            _logRepo = logRepo;
            _context = context;
            _httpContextAccessor = httpContextAccessor; // ตรงนี้ถึงจะผ่าน
            _notiService = notiService;
        }

        // --- ส่วนดึงข้อมูล (Get Overview) ---
        public async Task<List<StockBalanceDto>> GetStockOverviewAsync(string? searchId, string? category, string? keyword, string? variant)
        {
            var data = await _repo.GetStockBalancesAsync(searchId, category, keyword, variant);

            var today = DateTime.Now.Date;

            return data.Select(x => new StockBalanceDto
            {
                ItemCode = x.ItemCode,
                Name = x.Item?.Name ?? "Unknown",
                Category = x.Item?.Category ?? "-",
                Unit = x.Item?.Unit ?? "-",

                // โชว์ Balance ตามจริงตลอด
                TotalQuantity = x.TotalQuantity,
                Balance = x.Balance,
                TempWithdrawn = x.TempWithdrawn,

                // *** จุดสำคัญ: ถ้า LastReceivedDate ไม่ใช่วันนี้ ให้โชว์ 0 ***
                Received = (x.LastReceivedDate.Date == today) ? x.Received : 0,

                CreatedAt = x.CreatedAt.ToString("dd/MM/yyyy HH:mm:ss"),
                UpdatedAt = x.UpdatedAt.ToString("dd/MM/yyyy HH:mm:ss")
            }).ToList();
        }

        private string GetCurrentUserName()
        {
            // ดึง claim "name" ที่เรายัดไว้ตอน Login
            var name = _httpContextAccessor.HttpContext?.User?.FindFirst("name")?.Value;

            // ถ้าหาไม่เจอ (เช่น กรณีระบบทำงานเอง) ให้ใช้ชื่อ "System"
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

                    // --- 1. จัดการยอดรายวัน ---
                    var today = DateTime.Now.Date;
                    if (stock.LastReceivedDate.Date < today) stock.Received = request.Quantity;
                    else stock.Received += request.Quantity;
                    stock.LastReceivedDate = DateTime.Now;

                    // --- 2. Logic รับของคืน + ซื้อเผื่อขาด (อิงตาม Job) ---
                    stock.Balance += request.Quantity;

                    int amountToFillHole = 0;
                    int amountExpansion = 0;

                    // 🔥 ค้นหาว่า Job นี้ "ติดหนี้" อุปกรณ์ชิ้นนี้อยู่เท่าไหร่? (เบิกไป - เคยคืนแล้ว)
                    var jobOut = await _context.StockTransactions
                        .Where(t => t.JobNo == request.JobNo && t.ItemCode == request.ItemCode && t.Type == "OUT")
                        .SumAsync(t => t.Quantity);

                    var jobIn = await _context.StockTransactions
                        .Where(t => t.JobNo == request.JobNo && t.ItemCode == request.ItemCode && t.Type == "IN")
                        .SumAsync(t => t.Quantity);

                    int jobDeficit = jobOut - jobIn; // เช่น เบิกไป 2 คืนมา 0 = ติดหนี้ 2

                    if (jobDeficit > 0)
                    {
                        // โปะยอดค้าง "เฉพาะของ Job นี้" (สูงสุดไม่เกินที่ติดหนี้ และไม่เกินที่รับเข้ามา)
                        amountToFillHole = Math.Min(jobDeficit, request.Quantity);

                        // กัน Error: เผื่อ TempWithdrawn ในระบบเพี้ยน
                        if (stock.TempWithdrawn < amountToFillHole)
                            amountToFillHole = stock.TempWithdrawn;

                        stock.TempWithdrawn -= amountToFillHole;

                        // 🔥 ส่วนที่เกินจากหนี้ของ Job นี้ ถือเป็นการ "ซื้อเผื่อขาด (ของใหม่เข้าคลัง)"
                        amountExpansion = request.Quantity - amountToFillHole;
                    }
                    else
                    {
                        // ถ้า Job นี้ไม่เคยติดหนี้เลย (หรือแค่ซื้อของใหม่รหัสนี้เข้ามา) นำไปบวกเป็นของใหม่ทั้งหมด
                        amountExpansion = request.Quantity;
                    }

                    // TotalQuantity จะเพิ่มขึ้นเฉพาะส่วนที่เป็นของเผื่อขาดเท่านั้น
                    stock.TotalQuantity += amountExpansion;
                    stock.UpdatedAt = DateTime.Now;

                    // --- 3. Logs ---
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
                        "StockBalances",
                        request.ItemCode,
                        $"Balance: {oldBalance}",
                        packData,
                        currentUser
                    );

                    notiMessages.Add($"- {stock.Item?.Name ?? request.ItemCode} (+{request.Quantity}) [Job: {request.JobNo}]");
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                if (notiMessages.Any())
                {
                    await _notiService.SendNotificationAsync(
                        null,
                        "รับของเข้าคลัง",
                        $"คุณ {currentUser} รับของเข้าคลัง:\n" +
                        string.Join("\n", notiMessages), "STOCK_IN");
                }
            }
            catch { await transaction.RollbackAsync(); throw; }
        }

        // 2. เบิกของ (Withdraw): ลด Balance แต่ Total เท่าเดิม!
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

                    if (stock.Balance < request.Quantity)
                        throw new Exception($"อุปกรณ์ {stock.ItemCode} ไม่พอเบิก (ขอ {request.Quantity} มี {stock.Balance})");

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
                    await _logRepo.AddLogAsync(
                        $"STOCK_OUT (-{request.Quantity}) [Job: {request.JobNo}]",
                        "StockBalances",
                        request.ItemCode,
                        $"Balance: {oldBalance}",
                        packData,
                        currentUser
                    );

                    notiMessages.Add($"- {stock.Item?.Name ?? request.ItemCode} (-{request.Quantity}) [Job: {request.JobNo}]");
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                if (notiMessages.Any())
                {
                    await _notiService.SendNotificationAsync(
                        null,
                        "เบิกของออก",
                        $"คุณ {currentUser} เบิกของออก:\n" +
                        string.Join("\n", notiMessages), "STOCK_OUT");
                }
            }
            catch { await transaction.RollbackAsync(); throw; }
        }

        public async Task<List<PendingWithdrawalDto>> GetPendingWithdrawalsAsync()
        {
            // 1. ดึงประวัติ (Transactions) ทั้งหมด จัดกลุ่มตาม JobNo และ ItemCode
            var groupedTransactions = await _context.StockTransactions
                .Where(t => !string.IsNullOrEmpty(t.JobNo)) // เอาเฉพาะรายการที่มี JobNo
                .GroupBy(t => new { t.JobNo, t.ItemCode })
                .Select(g => new
                {
                    JobNo = g.Key.JobNo,
                    ItemCode = g.Key.ItemCode,
                    // รวมยอดเบิก (OUT) และยอดคืน (IN) ของ Job นี้
                    Withdrawn = g.Where(x => x.Type == "OUT").Sum(x => x.Quantity),
                    Returned = g.Where(x => x.Type == "IN").Sum(x => x.Quantity),
                    LastTransactionDate = g.Max(x => x.CreatedAt)
                })
                // 2. กรองเอาเฉพาะอันที่ ยืมไป > คืนกลับมา (แปลว่ายังค้างอยู่)
                .Where(x => (x.Withdrawn - x.Returned) > 0)
                .ToListAsync();

            // 3. ดึงชื่อ Item Name จากฐานข้อมูลมาผูก เพื่อให้ได้ชื่อภาษาคน
            var itemCodes = groupedTransactions.Select(t => t.ItemCode).Distinct().ToList();
            var itemsDict = await _context.StockBalances
                .Include(b => b.Item)
                .Where(b => itemCodes.Contains(b.ItemCode))
                .ToDictionaryAsync(b => b.ItemCode, b => b.Item?.Name ?? "Unknown");

            // 4. แมปข้อมูลส่งกลับไปให้หน้าบ้าน
            var pendingList = groupedTransactions.Select(t => new PendingWithdrawalDto
            {
                JobNo = t.JobNo,
                ItemCode = t.ItemCode,
                ItemName = itemsDict.ContainsKey(t.ItemCode) ? itemsDict[t.ItemCode] : "Unknown",
                PendingAmount = t.Withdrawn - t.Returned, // จำนวนที่ยังค้างของ Job นี้ล้วนๆ
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