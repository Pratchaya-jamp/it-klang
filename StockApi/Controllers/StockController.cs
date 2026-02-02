using Microsoft.AspNetCore.Mvc;
using StockApi.Services;

namespace StockApi.Controllers
{
    [ApiController]
    [Route("api/stocks")]
    public class StockController : ControllerBase
    {
        private readonly IStockService _service;

        public StockController(IStockService service)
        {
            _service = service;
        }

        // GET: api/stocks/overview
        // เอาไว้ดูยอดคงเหลือ
        [HttpGet("overview")]
        public async Task<IActionResult> GetOverview(
            [FromQuery] string? searchId,
            [FromQuery] string? category,
            [FromQuery] string? keyword) // <-- เพิ่มตัวนี้
        {
            var result = await _service.GetStockOverviewAsync(searchId, category, keyword);
            return Ok(new { data = result });
        }
    }
}