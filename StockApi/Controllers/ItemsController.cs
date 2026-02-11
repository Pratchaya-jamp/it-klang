using Microsoft.AspNetCore.Mvc;
using StockApi.Dtos; // ตรวจสอบว่ามี Dtos นี้อยู่จริง
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
            [FromQuery] string? variant)
        {
            // GET มักจะไม่ค่อยพัง เลยไม่ต้อง try-catch ก็ได้ (ยกเว้น Database ล่ม)
            var result = await _service.GetDashboardAsync(searchId, category, keyword, variant);
            return Ok(new { data = result }); // 200 OK
        }

        // POST: api/items
        [HttpPost]
        public async Task<IActionResult> CreateItem([FromBody] CreateItemRequest request)
        {
            try
            {
                var createdItem = await _service.CreateItemAsync(request);
                // 201 Created
                return StatusCode(201, new { message = "สร้างสินค้าสำเร็จ พร้อมเปิดบัญชีสต็อก", data = createdItem });
            }
            catch (Exception ex)
            {
                // 400 Bad Request (เช่น รหัสซ้ำ, ข้อมูลไม่ครบ)
                return BadRequest(new { message = ex.Message });
            }
        }

        // PUT: api/Items/IT-001
        [HttpPut("{itemCode}")]
        public async Task<IActionResult> UpdateItem(string itemCode, [FromBody] UpdateItemRequest request)
        {
            try
            {
                await _service.UpdateItemAsync(itemCode, request);
                // 200 OK
                return Ok(new { message = $"แก้ไขสินค้า {itemCode} สำเร็จ" });
            }
            catch (Exception ex)
            {
                // แยกแยะ Error
                if (ex.Message.Contains("ไม่พบ")) return NotFound(new { message = ex.Message }); // 404
                return BadRequest(new { message = ex.Message }); // 400
            }
        }

        // DELETE: api/Items/IT-001
        [HttpDelete("{itemCode}")]
        public async Task<IActionResult> DeleteItem(string itemCode)
        {
            try
            {
                await _service.DeleteItemAsync(itemCode);
                // 204 No Content (มาตรฐานคือไม่ส่ง Body กลับ)
                return NoContent();
            }
            catch (Exception ex)
            {
                // แยกแยะ Error (สำคัญมากสำหรับ Case Audit Log ที่เราเพิ่งทำ)
                if (ex.Message.Contains("ไม่พบ")) return NotFound(new { message = ex.Message }); // 404
                return BadRequest(new { message = ex.Message }); // 400 (ติด Audit Log/ของยังเหลือ)
            }
        }
    }
}