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

        // Endpoint: GET /api/stock/overview
        [HttpGet("overview")]
        public async Task<IActionResult> GetOverview()
        {
            var result = await _service.GetStockOverviewAsync();
            return Ok(new { data = result });
        }
    }
}