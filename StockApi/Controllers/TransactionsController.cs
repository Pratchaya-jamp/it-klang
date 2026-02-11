using Microsoft.AspNetCore.Mvc;
using StockApi.Dtos;
using StockApi.Services;

namespace StockApi.Controllers
{
    [ApiController]
    [Route("api/transactions")]
    public class TransactionsController : ControllerBase
    {
        private readonly IStockService _stockService;

        public TransactionsController(IStockService stockService)
        {
            _stockService = stockService;
        }

        // POST: api/transactions/receive
        [HttpPost("receive")]
        public async Task<IActionResult> Receive([FromBody] List<TransactionRequest> requests)
        {
            try
            {
                if (requests == null || !requests.Any())
                    return BadRequest(new { message = "ไม่พบรายการสินค้า" }); // 400 Bad Request

                await _stockService.ReceiveStockAsync(requests);

                // 201 Created (สร้าง Transaction สำเร็จ)
                return StatusCode(201, new { message = $"รับสินค้า {requests.Count} รายการเรียบร้อย" });
            }
            catch (Exception ex)
            {
                // ถ้า Error ว่าหาของไม่เจอ ให้ส่ง 404
                if (ex.Message.Contains("ไม่พบ")) return NotFound(new { message = ex.Message });

                // Error อื่นๆ (เช่น Validation) ให้ส่ง 400
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/transactions/withdraw
        [HttpPost("withdraw")]
        public async Task<IActionResult> Withdraw([FromBody] List<TransactionRequest> requests)
        {
            try
            {
                if (requests == null || !requests.Any())
                    return BadRequest(new { message = "ไม่พบรายการสินค้า" }); // 400 Bad Request

                await _stockService.WithdrawStockAsync(requests);

                // 201 Created (สร้าง Transaction สำเร็จ)
                return StatusCode(201, new { message = $"เบิกสินค้า {requests.Count} รายการเรียบร้อย" });
            }
            catch (Exception ex)
            {
                // ถ้า Error ว่าหาของไม่เจอ ให้ส่ง 404
                if (ex.Message.Contains("ไม่พบ")) return NotFound(new { message = ex.Message });

                // Error อื่นๆ (เช่น ของไม่พอ) ให้ส่ง 400
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}