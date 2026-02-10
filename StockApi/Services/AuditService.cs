using StockApi.Dtos;
using StockApi.Repositories;

namespace StockApi.Services
{
    public interface IAuditService
    {
        Task<List<SystemLogDto>> GetAllLogsAsync();
        Task<List<SystemLogDto>> GetLogsByItemCodeAsync(string itemCode);
    }

    public class AuditService : IAuditService
    {
        private readonly ISystemLogRepository _repo;

        public AuditService(ISystemLogRepository repo)
        {
            _repo = repo;
        }

        public async Task<List<SystemLogDto>> GetAllLogsAsync()
        {
            var logs = await _repo.GetAllLogsAsync();
            return MapToDto(logs);
        }

        public async Task<List<SystemLogDto>> GetLogsByItemCodeAsync(string itemCode)
        {
            var logs = await _repo.GetLogsByItemCodeAsync(itemCode);
            return MapToDto(logs);
        }

        // Helper Map ข้อมูล
        private List<SystemLogDto> MapToDto(List<StockApi.Entities.SystemLog> logs)
        {
            return logs.Select(x => {
                // ค่า Default
                string finalNewValue = x.NewValue ?? "-";
                string finalWithdraw = "+0";
                string finalReceive = "+0";

                // เช็คว่าข้อมูลเป็นแบบ Pack หรือเปล่า? (มีเครื่องหมาย | ไหม)
                if (x.NewValue != null && x.NewValue.Contains("|"))
                {
                    // แยกชิ้นส่วน: "Balance: 2|Withdraw:-2|Receive:+0"
                    var parts = x.NewValue.Split('|');

                    if (parts.Length >= 3)
                    {
                        finalNewValue = parts[0]; // "Balance: 2"
                        finalWithdraw = parts[1].Replace("Withdraw:", ""); // "-2"
                        finalReceive = parts[2].Replace("Receive:", "");  // "+0"
                    }
                }

                return new SystemLogDto
                {
                    Id = x.Id,
                    Action = x.Action,
                    TableName = x.TableName,
                    RecordId = x.RecordId,
                    OldValue = x.OldValue ?? "-",

                    // ใส่ค่าที่แกะออกมา
                    Withdraw = finalWithdraw,
                    Receive = finalReceive,
                    NewValue = finalNewValue,

                    CreatedBy = x.CreatedBy,
                    CreatedAt = x.CreatedAt.ToString("dd/MM/yyyy HH:mm:ss")
                };
            }).ToList();
        }
    }
}