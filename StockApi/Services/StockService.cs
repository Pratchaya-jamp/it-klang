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

        Task ReceiveStockAsync(TransactionRequest request);  // รับของ (เติมของ + ล้างยอดเบิก)
        Task WithdrawStockAsync(TransactionRequest request); // เบิกของ (ตัดของ + ทดยอดเบิก)
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

        public async Task ReceiveStockAsync(TransactionRequest request)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var stock = await _context.StockBalances.FirstOrDefaultAsync(x => x.ItemCode == request.ItemCode);
                if (stock == null) throw new Exception("ไม่พบสินค้า");

                // เก็บค่าเก่าไว้ทำ Log
                int oldBalance = stock.Balance;

                // --- 1. จัดการยอด Received รายวัน ---
                var today = DateTime.Now.Date;
                var lastReceive = stock.LastReceivedDate.Date;

                if (lastReceive < today)
                {
                    // ถ้าวันที่ล่าสุด เป็น "เมื่อวาน" (หรือเก่ากว่า)
                    // ให้รีเซ็ตยอดรับเป็นยอดใหม่เลย (เริ่มนับ 1 ใหม่ของวันนี้)
                    stock.Received = request.Quantity;
                }
                else
                {
                    // ถ้ายังเป็น "วันนี้" อยู่
                    // ให้บวกเพิ่มเข้าไป
                    stock.Received += request.Quantity;
                }

                // อัปเดตวันที่รับล่าสุด เป็นปัจจุบัน
                stock.LastReceivedDate = DateTime.Now;

                // --- 2. จัดการ Balance และ Temp (เหมือนเดิม) ---
                stock.Balance += request.Quantity;
                stock.TotalQuantity += request.Quantity;

                if (stock.TempWithdrawn > 0)
                {
                    stock.TempWithdrawn -= request.Quantity;
                    if (stock.TempWithdrawn < 0) stock.TempWithdrawn = 0;
                }

                stock.UpdatedAt = DateTime.Now;

                // --- 3. บันทึก Log (เหมือนเดิม ไม่เกี่ยวกับยอดรายวัน) ---
                await _txRepo.AddTransactionAsync(new StockTransaction
                {
                    TransactionNo = GenerateTransactionNo(),
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
                    "STOCK_IN",
                    "StockBalances",
                    request.ItemCode,
                    $"Balance: {oldBalance}", // OldValue
                    packData,                 // NewValue (ส่งแบบ Pack ไปก่อน)
                    request.CreatedBy
                );

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch { await transaction.RollbackAsync(); throw; }
        }

        // 2. เบิกของออก (OUT) -> ตัดของจริง และ ทดไว้ว่าเบิกไปเท่าไหร่ (รอเติม)
        public async Task WithdrawStockAsync(TransactionRequest request)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var stock = await _context.StockBalances.FirstOrDefaultAsync(x => x.ItemCode == request.ItemCode);
                if (stock == null) throw new Exception("ไม่พบสินค้า");

                // เช็คของพอไหม
                if (stock.Balance < request.Quantity)
                    throw new Exception($"สินค้าไม่พอเบิก (คงเหลือ {stock.Balance})");

                int oldBalance = stock.Balance;

                // Logic:
                stock.Balance -= request.Quantity;       // 1. ของหายจริง
                stock.TotalQuantity -= request.Quantity; // 2. ยอดรวมลดจริง

                stock.TempWithdrawn += request.Quantity; // 3. เพิ่มยอด Temp (เพื่อบอกว่า "พร่องไปเท่าไหร่")

                stock.UpdatedAt = DateTime.Now;

                // Log
                await _txRepo.AddTransactionAsync(new StockTransaction
                {
                    TransactionNo = GenerateTransactionNo(),
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
                    "STOCK_OUT",
                    "StockBalances",
                    request.ItemCode,
                    $"Balance: {oldBalance}", // OldValue
                    packData,                 // NewValue (ส่งแบบ Pack ไปก่อน)
                    request.CreatedBy
                );

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