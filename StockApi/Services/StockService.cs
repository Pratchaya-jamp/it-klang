using Microsoft.EntityFrameworkCore;
using StockApi.Config;
using StockApi.Dtos;
using StockApi.Entities;
using StockApi.Repositories;

namespace StockApi.Services
{
    public interface IStockService
    {
        Task<List<StockBalanceDto>> GetStockOverviewAsync(string? searchId, string? category, string? keyword, string? variant);

        Task ReceiveStockAsync(List<TransactionRequest> requests);
        Task WithdrawStockAsync(List<TransactionRequest> requests);
    }

    public class StockService : IStockService
    {
        private readonly IStockRepository _repo;
        private readonly ITransactionRepository _txRepo; // เพิ่มตัวนี้
        private readonly ISystemLogRepository _logRepo;
        private readonly AppDbContext _context;          // เพิ่มตัวนี้

        // Constructor ต้องรับค่าเข้ามาให้ครบ 3 ตัว
        public StockService(IStockRepository repo, ITransactionRepository txRepo, ISystemLogRepository logRepo, AppDbContext context)
        {
            _repo = repo;
            _txRepo = txRepo;
            _logRepo = logRepo;
            _context = context;
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

        public async Task ReceiveStockAsync(List<TransactionRequest> requests)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                foreach (var request in requests)
                {
                    var stock = await _context.StockBalances.FirstOrDefaultAsync(x => x.ItemCode == request.ItemCode);
                    if (stock == null) throw new Exception($"ไม่พบสินค้า Code: {request.ItemCode}");

                    int oldBalance = stock.Balance;

                    // --- 1. จัดการยอดรายวัน (Logic เดิม) ---
                    var today = DateTime.Now.Date;
                    if (stock.LastReceivedDate.Date < today) stock.Received = request.Quantity;
                    else stock.Received += request.Quantity;
                    stock.LastReceivedDate = DateTime.Now;

                    // --- 2. Logic ใหม่ของ Total & Balance ---
                    // Balance เพิ่มเสมอ (เพราะของเข้าคลัง)
                    stock.Balance += request.Quantity;

                    // คำนวณการเติมของ
                    int amountToFillHole = 0; // จำนวนที่เอาไปโปะยอดที่ขาด
                    int amountExpansion = 0;  // จำนวนที่เป็นของใหม่จริงๆ (ส่วนเกิน)

                    if (stock.TempWithdrawn > 0)
                    {
                        // ถ้ามียอดขาด ให้เอาไปเติมยอดขาดก่อน
                        amountToFillHole = Math.Min(stock.TempWithdrawn, request.Quantity);
                        stock.TempWithdrawn -= amountToFillHole;

                        // ส่วนที่เหลือคือนับเป็นของใหม่
                        amountExpansion = request.Quantity - amountToFillHole;
                    }
                    else
                    {
                        // ถ้าไม่มียอดขาดเลย ถือเป็นของใหม่ทั้งหมด
                        amountExpansion = request.Quantity;
                    }

                    // *** จุดสำคัญ: Total เพิ่มเฉพาะส่วนที่เป็นของใหม่ (Expansion) เท่านั้น ***
                    // ถ้าแค่ซื้อมาเติมคืน (FillHole) Total จะเท่าเดิม
                    stock.TotalQuantity += amountExpansion;

                    stock.UpdatedAt = DateTime.Now;

                    // --- 3. Logs ---
                    await _txRepo.AddTransactionAsync(new StockTransaction
                    {
                        TransactionNo = $"TRX-{DateTime.Now:yyyyMMdd}-{Guid.NewGuid().ToString().Substring(0, 5).ToUpper()}",
                        ItemCode = request.ItemCode,
                        Type = "IN",
                        Quantity = request.Quantity,
                        BalanceAfter = stock.Balance,
                        Note = request.Note,
                        CreatedBy = request.CreatedBy,
                        CreatedAt = DateTime.Now
                    });

                    string packData = $"Balance: {stock.Balance}|Withdraw:+0|Receive:+{request.Quantity}";
                    await _logRepo.AddLogAsync(
                        $"STOCK_IN (+{request.Quantity})",
                        "StockBalances",
                        request.ItemCode,
                        $"Balance: {oldBalance}",
                        packData,
                        request.CreatedBy
                    );
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch { await transaction.RollbackAsync(); throw; }
        }

        // 2. เบิกของ (Withdraw): ลด Balance แต่ Total เท่าเดิม!
        public async Task WithdrawStockAsync(List<TransactionRequest> requests)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                foreach (var request in requests)
                {
                    var stock = await _context.StockBalances.FirstOrDefaultAsync(x => x.ItemCode == request.ItemCode);
                    if (stock == null) throw new Exception($"ไม่พบสินค้า Code: {request.ItemCode}");

                    if (stock.Balance < request.Quantity)
                        throw new Exception($"สินค้า {stock.ItemCode} ไม่พอเบิก (ขอ {request.Quantity} มี {stock.Balance})");

                    int oldBalance = stock.Balance;

                    // --- Logic ใหม่ ---
                    stock.Balance -= request.Quantity;       // ของบนชั้นหายไป
                    stock.TempWithdrawn += request.Quantity; // ไปอยู่ที่ "ยอดรอเติม/ถูกเบิก"

                    // *** จุดสำคัญ: TotalQuantity ไม่ลด! ***
                    // เพราะเราถือว่าทรัพย์สินยังเป็นของบริษัท (แค่เปลี่ยนสถานะจาก Shelf -> In Use/Missing)
                    // stock.TotalQuantity -= request.Quantity; // <--- บรรทัดนี้ลบทิ้งไปเลย

                    stock.UpdatedAt = DateTime.Now;

                    // --- Logs ---
                    await _txRepo.AddTransactionAsync(new StockTransaction
                    {
                        TransactionNo = $"TRX-{DateTime.Now:yyyyMMdd}-{Guid.NewGuid().ToString().Substring(0, 5).ToUpper()}",
                        ItemCode = request.ItemCode,
                        Type = "OUT",
                        Quantity = request.Quantity,
                        BalanceAfter = stock.Balance,
                        Note = request.Note,
                        CreatedBy = request.CreatedBy,
                        CreatedAt = DateTime.Now
                    });

                    string packData = $"Balance: {stock.Balance}|Withdraw:-{request.Quantity}|Receive:+0";
                    await _logRepo.AddLogAsync(
                        $"STOCK_OUT (-{request.Quantity})",
                        "StockBalances",
                        request.ItemCode,
                        $"Balance: {oldBalance}",
                        packData,
                        request.CreatedBy
                    );
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch { await transaction.RollbackAsync(); throw; }
        }

        private string GenerateTransactionNo()
        {
            return $"TRX-{DateTime.Now:yyyyMMdd}-{Guid.NewGuid().ToString().Substring(0, 5).ToUpper()}";
        }
    }
}