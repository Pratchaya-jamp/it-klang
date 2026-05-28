using Microsoft.AspNetCore.Mvc;
using StockApi.Services;
using Microsoft.AspNetCore.Authorization;

namespace StockApi.Controllers
{
    [ApiController]
    [Route("api/stocks")]
    [Authorize]
    public class StocksController : ControllerBase
    {
        private readonly IStockService _service;

        public StocksController(IStockService service)
        {
            _service = service;
        }

        // GET: api/stocks/overview
        // เอาไว้ดูยอดคงเหลือ (Stock Balance)
        [HttpGet("overview")]
        public async Task<IActionResult> GetOverview(
            [FromQuery] string? searchId,
            [FromQuery] string? category,
            [FromQuery] string? keyword,
            [FromQuery] string? variant)
        {
            try
            {
                var result = await _service.GetStockOverviewAsync(searchId, category, keyword, variant);

                // 200 OK
                return Ok(new { data = result });
            }
            catch (Exception ex)
            {
                // 400 Bad Request (กรณีส่ง Query ผิด หรือ DB มีปัญหา)
                return BadRequest(new { message = ex.Message });
            }
        }

        // 📊 GET: api/stocks/charts/balances
        [HttpGet("charts/balances")]
        public async Task<IActionResult> GetBalanceChart()
        {
            try
            {
                // 🔥 แก้ตรงนี้: เปลี่ยน _stockService เป็น _service
                var data = await _service.GetBalanceByCategoryChartAsync();
                return Ok(data);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // 📈 GET: api/stocks/charts/withdrawals?days=7
        // days สามารถระบุเป็น 7, 30 หรือ 365 ได้
        [HttpGet("charts/withdrawals")]
        public async Task<IActionResult> GetWithdrawalChart(
            [FromQuery] int? days,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            try
            {
                // โยนหน้าที่คำนวณและกรองวันที่ไปให้ Service จัดการทั้งหมด
                var data = await _service.GetWithdrawalByCategoryChartAsync(days, startDate, endDate);
                return Ok(data);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}