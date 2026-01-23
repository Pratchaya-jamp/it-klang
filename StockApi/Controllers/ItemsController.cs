using Microsoft.AspNetCore.Mvc;
using StockApi.Services;

namespace StockApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ItemsController : ControllerBase
    {
        private readonly IItemService _service;

        public ItemsController(IItemService service)
        {
            _service = service;
        }

        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard([FromQuery] string? searchId, [FromQuery] string? category)
        {
            var result = await _service.GetDashboardAsync(searchId, category);
            return Ok(new { data = result });
        }
    }
}