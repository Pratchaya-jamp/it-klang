using Microsoft.AspNetCore.Mvc;
using StockApi.Services;

namespace StockApi.Controllers
{
    [ApiController]
    [Route("api/auditlogs")]
    public class AuditLogsController : ControllerBase
    {
        private readonly IAuditService _auditService;

        public AuditLogsController(IAuditService auditService)
        {
            _auditService = auditService;
        }

        // GET: api/auditlogs (ดูทั้งหมด)
        [HttpGet]
        public async Task<IActionResult> GetAllLogs()
        {
            try
            {
                var logs = await _auditService.GetAllLogsAsync();

                // 200 OK
                return Ok(logs);
            }
            catch (Exception ex)
            {
                // 400 Bad Request
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: api/auditlogs/IT-001 (ดูเฉพาะสินค้านั้น)
        [HttpGet("{itemCode}")]
        public async Task<IActionResult> GetLogsByItem(string itemCode)
        {
            try
            {
                var logs = await _auditService.GetLogsByItemCodeAsync(itemCode);

                // 200 OK
                return Ok(logs);
            }
            catch (Exception ex)
            {
                // ถ้า Error ว่าหาไม่เจอ ให้ส่ง 404
                if (ex.Message.Contains("ไม่พบ")) return NotFound(new { message = ex.Message });

                // Error อื่นๆ ส่ง 400
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}