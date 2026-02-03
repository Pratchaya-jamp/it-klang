using Microsoft.AspNetCore.Mvc;
using StockApi.Dtos;
using StockApi.Services;

namespace StockApi.Controllers
{
    [ApiController]
    [Route("api/items")]
    public class ItemsController : ControllerBase
    {
        private readonly IItemService _service;

        public ItemsController(IItemService service)
        {
            _service = service;
        }

        // GET: api/items/dashboard
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard(
            [FromQuery] string? searchId,
            [FromQuery] string? category,
            [FromQuery] string? keyword,
            [FromQuery] string? variant) // <-- เพิ่มตัวนี้
        {
            var result = await _service.GetDashboardAsync(searchId, category, keyword, variant);
            return Ok(new { data = result });
        }

        // POST: api/items
        // ใช้ลงทะเบียนสินค้าใหม่
        [HttpPost]
        public async Task<IActionResult> CreateItem([FromBody] CreateItemRequest request)
        {
            var createdItem = await _service.CreateItemAsync(request);
            return StatusCode(201, new { message = "สร้างสินค้าสำเร็จ พร้อมเปิดบัญชีสต็อก", data = createdItem });
        }

        // PUT: api/Items/IT-001 (แก้ไข)
        [HttpPut("{itemCode}")]
        public async Task<IActionResult> UpdateItem(string itemCode, [FromBody] UpdateItemRequest request)
        {
            await _service.UpdateItemAsync(itemCode, request);
            return Ok(new { message = $"แก้ไขสินค้า {itemCode} สำเร็จ" });
        }

        // DELETE: api/Items/IT-001 (ลบ)
        [HttpDelete("{itemCode}")]
        public async Task<IActionResult> DeleteItem(string itemCode)
        {
            await _service.DeleteItemAsync(itemCode);
            return Ok(new { message = $"ลบสินค้า {itemCode} สำเร็จ" });
        }
    }
}