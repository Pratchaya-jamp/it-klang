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

        // 1. GET: api/auditlogs (ดูทั้งหมด)
        [HttpGet]
        public async Task<IActionResult> GetAllLogs()
        {
            try
            {
                var logs = await _auditService.GetAllLogsAsync();
                return Ok(logs);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // 2. GET: api/auditlogs/IT-001 (ดูเฉพาะสินค้านั้น)
        [HttpGet("{itemCode}")]
        public async Task<IActionResult> GetLogsByItem(string itemCode)
        {
            try
            {
                var logs = await _auditService.GetLogsByItemCodeAsync(itemCode);
                return Ok(logs);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}