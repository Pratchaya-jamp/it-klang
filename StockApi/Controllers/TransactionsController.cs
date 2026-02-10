using Microsoft.AspNetCore.Mvc;
using StockApi.Dtos;
using StockApi.Services;

namespace StockApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TransactionsController : ControllerBase
    {
        private readonly IStockService _stockService;

        public TransactionsController(IStockService stockService)
        {
            _stockService = stockService;
        }

        // POST: api/transactions/receive
        [HttpPost("receive")]
        public async Task<IActionResult> Receive([FromBody] TransactionRequest request)
        {
            try
            {
                await _stockService.ReceiveStockAsync(request);
                return Ok(new { message = "รับสินค้าเข้าสต็อกเรียบร้อย" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/transactions/withdraw
        [HttpPost("withdraw")]
        public async Task<IActionResult> Withdraw([FromBody] TransactionRequest request)
        {
            try
            {
                await _stockService.WithdrawStockAsync(request);
                return Ok(new { message = "เบิกสินค้าออกจากสต็อกเรียบร้อย" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}