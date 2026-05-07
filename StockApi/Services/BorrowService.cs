using System.Globalization;
using Microsoft.EntityFrameworkCore;
using StockApi.Config;
using StockApi.Dtos;
using StockApi.Entities;
using StockApi.Repositories;
using Hangfire;
using StockApi.Exceptions;

namespace StockApi.Services
{
    public interface IBorrowService
    {
        Task<BorrowTransaction> BorrowItemAsync(string staffId, string recorderName, string recorderEmail, BorrowRequestDto request);
        Task<BorrowTransaction> ReturnItemAsync(string staffId, string recorderName, string transactionId);

        // 🔥 1. เปลี่ยนชื่อและเอาพารามิเตอร์ staffId ออก
        Task<List<BorrowResponseDto>> GetAllHistoryAsync();
    }

    public class BorrowService : IBorrowService
    {
        private readonly BorrowRepository _borrowRepo;
        private readonly ISystemLogRepository _systemLogRepo;
        private readonly AppDbContext _context;
        private readonly INotificationService _notiService;

        public BorrowService(BorrowRepository borrowRepo, ISystemLogRepository systemLogRepo, AppDbContext context, INotificationService notiService)
        {
            _borrowRepo = borrowRepo;
            _systemLogRepo = systemLogRepo;
            _context = context;
            _notiService = notiService;
        }

        public async Task<BorrowTransaction> BorrowItemAsync(string staffId, string recorderName, string recorderEmail, BorrowRequestDto request)
        {
            if (request.ItemCode.StartsWith("DRAFT-")) throw new BadRequestException($"ไม่สามารถทำรายการยืมได้ เนื่องจากอุปกรณ์นี้ ({request.ItemCode}) ยังอยู่ในสถานะแบบร่าง (Draft)");
            var item = await _context.Items
                .Include(i => i.StockBalance)
                .FirstOrDefaultAsync(i => i.ItemCode == request.ItemCode);

            if (item == null) throw new Exception($"ไม่พบอุปกรณ์รหัส {request.ItemCode}");
            if (item.StockBalance == null) throw new Exception("อุปกรณ์นี้ยังไม่ได้ตั้งค่าสต็อก");

            int oldBalance = item.StockBalance.Balance;
            if (oldBalance < request.Quantity) throw new Exception($"ของไม่พอ (เหลือ {oldBalance})");

            DateTime? parsedDueDate = null;
            if (!string.IsNullOrWhiteSpace(request.DueDate))
            {
                if (DateTime.TryParseExact(request.DueDate, "dd/MM/yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out DateTime temp))
                    parsedDueDate = temp;
                else
                    throw new Exception("รูปแบบวันที่ต้องเป็น dd/MM/yyyy");
            }

            var thaiZone = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
            DateTime bangkokNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, thaiZone);

            string? hangfireJobId = null;

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                if (!string.IsNullOrEmpty(recorderEmail) && parsedDueDate.HasValue)
                {
                    DateTime scheduleTime;
                    int durationDays = (parsedDueDate.Value.Date - bangkokNow.Date).Days + 1;

                    if (durationDays == 1)
                        scheduleTime = bangkokNow.Hour < 12 ? bangkokNow.Date.AddHours(12).AddMinutes(30) : bangkokNow.Date.AddHours(15);
                    else if (durationDays >= 2 && durationDays <= 3)
                        scheduleTime = parsedDueDate.Value.Date.AddHours(8).AddMinutes(30);
                    else if (durationDays >= 4 && durationDays <= 5)
                        scheduleTime = bangkokNow.Date.AddDays(2).AddHours(8).AddMinutes(30);
                    else if (durationDays >= 6 && durationDays <= 7)
                        scheduleTime = bangkokNow.Date.AddDays(4).AddHours(8).AddMinutes(30);
                    else
                        scheduleTime = parsedDueDate.Value.Date.AddDays(-2).AddHours(8).AddMinutes(30);

                    DateTimeOffset scheduleOffset = new DateTimeOffset(scheduleTime, thaiZone.GetUtcOffset(scheduleTime));

                    if (scheduleOffset > DateTimeOffset.UtcNow)
                    {
                        hangfireJobId = BackgroundJob.Schedule<IEmailService>(
                            service => service.SendEmailAsync(
                                recorderEmail,
                                $"แจ้งเตือน: ถึงกำหนดคืน {item.Name}",
                                $@"<h3>แจ้งเตือนการคืนของ</h3>
                                   <p>เรียนคุณ {recorderName}</p>
                                   <p>อย่าลืมติดตามคืนอุปกรณ์: <b>{item.Name}</b></p>
                                   <p>จำนวน: {request.Quantity} {item.Unit}(s)</p>
                                   <p>กำหนดคืน: {request.DueDate}</p>
                                   <p>Job ID: {request.JobId}</p>"
                            ),
                            scheduleOffset
                        );
                    }
                }

                item.StockBalance.Balance -= request.Quantity;
                _context.StockBalances.Update(item.StockBalance);
                await _context.SaveChangesAsync();

                await _systemLogRepo.AddLogAsync("BORROW", "StockBalances", item.ItemCode, oldBalance.ToString(), item.StockBalance.Balance.ToString(), recorderName);

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
                    Note = request.Note,
                    HangfireJobId = hangfireJobId
                };
                await _borrowRepo.AddAsync(borrowLog);

                await transaction.CommitAsync();

                await _notiService.SendNotificationAsync(
                    null,
                    "มีรายการยืมอุปกรณ์",
                    $"คุณ {recorderName} ได้ทำรายการยืม '{item.Name}' จำนวน {request.Quantity} ชิ้น",
                    "BORROW");
                return borrowLog;
            }
            catch
            {
                if (!string.IsNullOrEmpty(hangfireJobId))
                {
                    BackgroundJob.Delete(hangfireJobId);
                }
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<BorrowTransaction> ReturnItemAsync(string staffId, string recorderName, string transactionId)
        {
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
                    item.StockBalance.Balance += borrowLog.Quantity;
                    _context.StockBalances.Update(item.StockBalance);
                    await _context.SaveChangesAsync();

                    await _systemLogRepo.AddLogAsync("RETURN", "StockBalances", item.ItemCode, oldBalance.ToString(), item.StockBalance.Balance.ToString(), recorderName);
                }

                borrowLog.Status = "Returned";
                borrowLog.ReturnDate = bangkokNow;

                if (!string.IsNullOrEmpty(borrowLog.HangfireJobId))
                {
                    BackgroundJob.Delete(borrowLog.HangfireJobId);
                    borrowLog.HangfireJobId = null;
                }

                await _borrowRepo.UpdateAsync(borrowLog);
                await transaction.CommitAsync();

                await _notiService.SendNotificationAsync(
                    null,
                    "คืนอุปกรณ์เรียบร้อย",
                    $"คุณ {recorderName} ได้ทำรายการคืน '{borrowLog.ItemName}' จำนวน {borrowLog.Quantity} ชิ้น",
                    "RETURN");
                return borrowLog;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        // 🔥 2. เปลี่ยนฟังก์ชันดึงประวัติมาเป็นตัวนี้
        public async Task<List<BorrowResponseDto>> GetAllHistoryAsync()
        {
            // ดึงข้อมูลทั้งหมดโดยไม่กรอง StaffId และเรียงลำดับเวลาใหม่สุดขึ้นก่อน
            var logs = await _context.BorrowTransactions
                .OrderByDescending(l => l.BorrowDate)
                .ToListAsync();

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