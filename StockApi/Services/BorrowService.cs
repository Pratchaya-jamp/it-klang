using System.Globalization;
using Microsoft.EntityFrameworkCore;
using StockApi.Config;
using StockApi.Dtos;
using StockApi.Entities;
using StockApi.Repositories; // เรียกใช้ Interface
using Hangfire;

namespace StockApi.Services
{
    public interface IBorrowService
    {
        Task<BorrowTransaction> BorrowItemAsync(string staffId, string recorderName, string recorderEmail, BorrowRequestDto request);
        Task<BorrowTransaction> ReturnItemAsync(string staffId, string recorderName, string transactionId);
        Task<List<BorrowResponseDto>> GetMyHistoryAsync(string staffId);
    }

    public class BorrowService : IBorrowService
    {
        private readonly BorrowRepository _borrowRepo;
        private readonly ISystemLogRepository _systemLogRepo; // ✅ เปลี่ยนเป็น Interface
        private readonly AppDbContext _context;

        // ✅ Inject Interface เข้ามา
        public BorrowService(BorrowRepository borrowRepo, ISystemLogRepository systemLogRepo, AppDbContext context)
        {
            _borrowRepo = borrowRepo;
            _systemLogRepo = systemLogRepo;
            _context = context;
        }

        public async Task<BorrowTransaction> BorrowItemAsync(string staffId, string recorderName, string recorderEmail, BorrowRequestDto request)
        {
            var item = await _context.Items
                .Include(i => i.StockBalance)
                .FirstOrDefaultAsync(i => i.ItemCode == request.ItemCode);

            if (item == null) throw new Exception($"ไม่พบสินค้ารหัส {request.ItemCode}");
            if (item.StockBalance == null) throw new Exception("สินค้านี้ยังไม่ได้ตั้งค่าสต็อก");

            int oldBalance = item.StockBalance.Balance;

            if (oldBalance < request.Quantity)
                throw new Exception($"ของไม่พอ (เหลือ {oldBalance})");

            DateTime? parsedDueDate = null;

            if (!string.IsNullOrWhiteSpace(request.DueDate))
            {
                if (DateTime.TryParseExact(
                    request.DueDate,
                    "dd/MM/yyyy",
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.None,
                    out DateTime temp))
                {
                    parsedDueDate = temp;
                }
                else
                {
                    throw new Exception("รูปแบบวันที่ต้องเป็น dd/MM/yyyy");
                }
            }

            var thaiZone = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
            DateTime bangkokNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, thaiZone);

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. ตัดสต็อก
                item.StockBalance.Balance -= request.Quantity;
                _context.StockBalances.Update(item.StockBalance);
                await _context.SaveChangesAsync();

                // 2. ✅ บันทึก Log (เรียกตาม Repo เดิมของคุณ)
                await _systemLogRepo.AddLogAsync(
                    action: "BORROW",
                    table: "StockBalances",
                    recordId: item.ItemCode,
                    oldValue: oldBalance.ToString(),
                    newValue: item.StockBalance.Balance.ToString(),
                    by: recorderName
                );

                // 3. สร้าง Transaction ยืม
                var borrowLog = new BorrowTransaction
                {
                    TransactionId = Guid.NewGuid().ToString("N").Substring(0, 10).ToUpper(),
                    StaffId = staffId,
                    RecorderName = recorderName,
                    ItemCode = item.ItemCode,
                    ItemName = item.Name,
                    Quantity = request.Quantity,
                    JobId = request.JobId,
                    BorrowDate = bangkokNow,
                    DueDate = parsedDueDate,
                    Status = "Borrowed",
                    Note = request.Note
                };
                await _borrowRepo.AddAsync(borrowLog);

                if (!string.IsNullOrEmpty(recorderEmail) && parsedDueDate.HasValue)
                {
                    DateTime scheduleTime;

                    // คำนวณระยะเวลา (จำนวนวัน)
                    int durationDays = (parsedDueDate.Value.Date - bangkokNow.Date).Days + 1;

                    // Case 1: ยืม-คืน วันเดียวกัน
                    if (durationDays == 1)
                    {
                        if (bangkokNow.Hour < 12)
                            scheduleTime = bangkokNow.Date.AddHours(12).AddMinutes(30); // แจ้ง 12.30
                        else
                            scheduleTime = bangkokNow.Date.AddHours(15); // แจ้ง 15.00
                    }
                    // Case 2: ยืม 2-3 วัน -> แจ้ง 08.30 ในวันกำหนดคืน
                    else if (durationDays >= 2 && durationDays <= 3)
                    {
                        scheduleTime = parsedDueDate.Value.Date.AddHours(8).AddMinutes(30);
                    }
                    // Case 3: ยืม 4-5 วัน -> แจ้งวันที่ 3 ของการยืม เวลา 08.30
                    else if (durationDays >= 4 && durationDays <= 5)
                    {
                        scheduleTime = bangkokNow.Date.AddDays(2).AddHours(8).AddMinutes(30);
                    }
                    // Case 4: ยืม 6-7 วัน -> แจ้งวันที่ 5 ของการยืม เวลา 08.30
                    else if (durationDays >= 6 && durationDays <= 7)
                    {
                        scheduleTime = bangkokNow.Date.AddDays(4).AddHours(8).AddMinutes(30);
                    }
                    // Case 5: นอกเหนือจากนั้น -> แจ้งก่อนคืน 2 วัน เวลา 08.30
                    else
                    {
                        scheduleTime = parsedDueDate.Value.Date.AddDays(-2).AddHours(8).AddMinutes(30);
                    }

                    // แปลงเวลาที่คำนวณได้ ให้เป็น DateTimeOffset เพื่อส่งให้ Hangfire
                    DateTimeOffset scheduleOffset = new DateTimeOffset(scheduleTime, thaiZone.GetUtcOffset(scheduleTime));

                    Console.WriteLine("========== DEBUG SCHEDULE ==========");
                    Console.WriteLine($"Email: {recorderEmail}");
                    Console.WriteLine($"ParsedDueDate: {parsedDueDate}");
                    Console.WriteLine($"ScheduleTime (Bangkok): {scheduleOffset}");
                    Console.WriteLine($"Now UTC: {DateTimeOffset.UtcNow}");
                    Console.WriteLine($"Will Schedule: {scheduleOffset > DateTimeOffset.UtcNow}");
                    Console.WriteLine("====================================");

                    // ถ้าเวลายังไม่ผ่านไป ให้ตั้ง Job
                    if (scheduleOffset > DateTimeOffset.UtcNow)
                    {
                        BackgroundJob.Schedule<IEmailService>(
                            service => service.SendEmailAsync(
                                recorderEmail,
                                $"แจ้งเตือน: ถึงกำหนดคืน {item.Name}",
                                $@"
                                    <h3>แจ้งเตือนการคืนของ</h3>
                                    <p>เรียนคุณ {recorderName}</p>
                                    <p>อย่าลืมติดตามคืนอุปกรณ์: <b>{item.Name}</b></p>
                                    <p>จำนวน: {request.Quantity} {item.Unit}(s)</p>
                                    <p>กำหนดคืน: {request.DueDate}</p>
                                    <p>Job ID: {request.JobId}</p>
                                "
                            ),
                            scheduleOffset
                        );
                    }
                }

                await transaction.CommitAsync();
                return borrowLog;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<BorrowTransaction> ReturnItemAsync(string staffId, string recorderName, string transactionId)
        {
            // ✅ ใช้ฟังก์ชันใหม่ GetByTransactionIdAsync
            var borrowLog = await _borrowRepo.GetByTransactionIdAsync(transactionId);

            if (borrowLog == null) throw new Exception($"ไม่พบรายการหมายเลข {transactionId}");
            if (borrowLog.Status == "Returned") throw new Exception("รายการนี้คืนไปแล้ว");

            var item = await _context.Items
                .Include(i => i.StockBalance)
                .FirstOrDefaultAsync(i => i.ItemCode == borrowLog.ItemCode);

            DateTime bangkokNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time"));

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                if (item != null && item.StockBalance != null)
                {
                    int oldBalance = item.StockBalance.Balance;

                    // 1. คืนสต็อก
                    item.StockBalance.Balance += borrowLog.Quantity;
                    _context.StockBalances.Update(item.StockBalance);
                    await _context.SaveChangesAsync();

                    // 2. ✅ บันทึก Log (เรียกตาม Repo เดิมของคุณ)
                    await _systemLogRepo.AddLogAsync(
                        action: "RETURN",
                        table: "StockBalances",
                        recordId: item.ItemCode,
                        oldValue: oldBalance.ToString(),
                        newValue: item.StockBalance.Balance.ToString(),
                        by: recorderName
                    );
                }

                // 3. อัปเดตสถานะ
                borrowLog.Status = "Returned";
                borrowLog.ReturnDate = bangkokNow;
                await _borrowRepo.UpdateAsync(borrowLog);

                await transaction.CommitAsync();
                return borrowLog;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<List<BorrowResponseDto>> GetMyHistoryAsync(string staffId)
        {
            var logs = await _borrowRepo.GetByStaffIdAsync(staffId);
            return logs.Select(l => new BorrowResponseDto
            {
                Id = l.Id,
                TransactionId = l.TransactionId,
                ItemCode = l.ItemCode,
                ItemName = l.ItemName,
                Quantity = l.Quantity,
                JobId = l.JobId ?? "",
                RecorderName = l.RecorderName,
                Status = l.Status,
                BorrowDate = l.BorrowDate,
                DueDate = l.DueDate
            }).ToList();
        }
    }
}