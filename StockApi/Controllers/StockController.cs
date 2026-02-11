using Microsoft.AspNetCore.Mvc;
using StockApi.Services;

namespace StockApi.Controllers
{
    [ApiController]
    [Route("api/stocks")]
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
    }
}