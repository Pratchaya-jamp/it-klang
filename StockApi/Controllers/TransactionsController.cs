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
        public async Task<IActionResult> Receive([FromBody] List<TransactionRequest> requests) // รับเป็น List
        {
            try
            {
                if (requests == null || !requests.Any())
                    return BadRequest(new { message = "ไม่พบรายการสินค้า" });

                await _stockService.ReceiveStockAsync(requests);
                return Ok(new { message = $"รับสินค้า {requests.Count} รายการเรียบร้อย" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/transactions/withdraw
        [HttpPost("withdraw")]
        public async Task<IActionResult> Withdraw([FromBody] List<TransactionRequest> requests) // รับเป็น List
        {
            try
            {
                if (requests == null || !requests.Any())
                    return BadRequest(new { message = "ไม่พบรายการสินค้า" });

                await _stockService.WithdrawStockAsync(requests);
                return Ok(new { message = $"เบิกสินค้า {requests.Count} รายการเรียบร้อย" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}