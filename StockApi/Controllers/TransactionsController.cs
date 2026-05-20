using Microsoft.AspNetCore.Mvc;
using StockApi.Dtos;
using StockApi.Services;
using Microsoft.AspNetCore.Authorization;

namespace StockApi.Controllers
{
    [ApiController]
    [Route("api/transactions")]
    [Authorize]
    public class TransactionsController : ControllerBase
    {
        private readonly IStockService _stockService;

        public TransactionsController(IStockService stockService)
        {
            _stockService = stockService;
        }

        //[HttpGet("pending")]
        //public async Task<IActionResult> GetPendingWithdrawals()
        //{
        //    try
        //    {
        //        var result = await _stockService.GetPendingWithdrawalsAsync();
        //        return Ok(new { data = result, count = result.Count });
        //    }
        //    catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        //}

        // 📋 1. ดึงรายการขอสั่งซื้อที่ค้างอยู่ (PR)
        [HttpGet("purchase/request")]
        public async Task<IActionResult> GetPurchaseRequests()
        {
            try
            {
                var result = await _stockService.GetPurchaseRequestsAsync();
                return Ok(new { data = result, count = result.Count });
            }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        // 🔥 1. ขอซื้อ (PR)
        [HttpPost("purchase/request")]
        public async Task<IActionResult> RequestPurchase([FromBody] List<PurchaseRequestDto> requests)
        {
            try
            {
                if (requests == null || !requests.Any()) return BadRequest(new { message = "ไม่พบรายการ" });
                await _stockService.RequestPurchaseAsync(requests);
                return StatusCode(201, new { message = $"ส่งเรื่องขอสั่งซื้อ {requests.Count} รายการเรียบร้อย" });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // 📥 2. รับของเข้า (IN)
        [HttpPost("receive")]
        public async Task<IActionResult> ReceiveStock([FromBody] List<ReceiveRequest> requests)
        {
            try
            {
                if (requests == null || !requests.Any()) return BadRequest(new { message = "ไม่พบรายการ" });
                await _stockService.ReceiveStockAsync(requests);
                return StatusCode(201, new { message = $"รับสินค้า {requests.Count} รายการเรียบร้อย" });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // 📋 2. ดึงรายการขอเบิกที่รออนุมัติ (PENDING_OUT)
        [HttpGet("withdraw/request")]
        public async Task<IActionResult> GetPendingWithdrawals()
        {
            try
            {
                var result = await _stockService.GetPendingWithdrawalsAsync();
                return Ok(new { data = result, count = result.Count });
            }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        // 📤 3. ขอเบิก (PENDING_OUT)
        [HttpPost("withdraw/request")]
        public async Task<IActionResult> RequestWithdraw([FromBody] List<WithdrawRequest> requests)
        {
            try
            {
                if (requests == null || !requests.Any()) return BadRequest(new { message = "ไม่พบรายการ" });
                await _stockService.RequestWithdrawAsync(requests);
                return StatusCode(201, new { message = $"ทำเรื่องขอเบิก {requests.Count} รายการเรียบร้อย (รอการอนุมัติ)" });
            }
            catch (Exception ex)
            {
                // 🔥 ล้วงเอา InnerException (ไส้ในที่แท้จริงของ Database) ออกมาโชว์
                string actualError = ex.InnerException != null ? ex.InnerException.Message : ex.Message;
                return BadRequest(new { message = actualError });
            }
        }

        // ✅ 4. อนุมัติเบิก (APPROVE -> OUT)
        [HttpPost("withdraw/approve")]
        public async Task<IActionResult> ApproveWithdraw([FromBody] ApproveWithdrawRequest request)
        {
            try
            {
                await _stockService.ApproveWithdrawAsync(request);
                return Ok(new { message = "อนุมัติและจ่ายอุปกรณ์เรียบร้อยแล้ว" });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // 🗑️ 5. ตัดจำหน่าย (WRITE_OFF)
        [HttpPost("write-off")]
        public async Task<IActionResult> WriteOffStock([FromBody] WriteOffRequest request)
        {
            try
            {
                await _stockService.WriteOffStockAsync(request);
                return StatusCode(201, new { message = "ตัดจำหน่ายอุปกรณ์เรียบร้อยแล้ว" });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpGet("write-off/summary")]
        public async Task<IActionResult> GetWriteOffSummary()
        {
            try
            {
                var result = await _stockService.GetWriteOffSummaryAsync();
                return Ok(result);
            }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        // 📋 GET: api/transactions/purchase/history
        [HttpGet("purchase/history")]
        public async Task<IActionResult> GetPurchaseHistory()
        {
            try
            {
                var result = await _stockService.GetPurchaseHistoryAsync();
                return Ok(new { data = result, count = result.Count });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // 📋 GET: api/transactions/withdraw/history
        [HttpGet("withdraw/history")]
        public async Task<IActionResult> GetWithdrawHistory()
        {
            try
            {
                var result = await _stockService.GetWithdrawHistoryAsync();
                return Ok(new { data = result, count = result.Count });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }
}