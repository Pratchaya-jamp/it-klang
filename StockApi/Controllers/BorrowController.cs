using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockApi.Dtos;
using StockApi.Services;

namespace StockApi.Controllers
{
    [Route("api/borrow")]
    [ApiController]
    [Authorize] // ต้อง Login
    public class BorrowController : ControllerBase
    {
        private readonly IBorrowService _borrowService;

        public BorrowController(IBorrowService borrowService)
        {
            _borrowService = borrowService;
        }

        [HttpPost("request")]
        public async Task<IActionResult> Borrow([FromBody] BorrowRequestDto request)
        {
            try
            {
                var staffId = User.Claims.FirstOrDefault(c => c.Type == "id")?.Value;
                var recorderName = User.Claims.FirstOrDefault(c => c.Type == "name")?.Value ?? "Unknown";

                // ✅ 1. เพิ่ม: ดึง Email จาก Token (ถ้าไม่มีให้เป็นค่าว่าง)
                var recorderEmail = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Email)?.Value
                                    ?? User.Claims.FirstOrDefault(c => c.Type == "email")?.Value
                                    ?? "";

                Console.WriteLine("===== CONTROLLER DEBUG =====");
                Console.WriteLine($"recorderEmail: '{recorderEmail}'");
                Console.WriteLine($"DueDate from request: '{request.DueDate}'");
                Console.WriteLine("============================");

                // ✅ 2. แก้: ส่ง parameter ให้ครบ 4 ตัว
                // (staffId, recorderName, recorderEmail, request)
                var result = await _borrowService.BorrowItemAsync(staffId!, recorderName, recorderEmail, request);

                return Ok(new { message = "ยืมสำเร็จ", data = result });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("return/{transactionId}")]
        public async Task<IActionResult> Return(string transactionId) // ✅ รับเป็น string
        {
            try
            {
                var staffId = User.Claims.FirstOrDefault(c => c.Type == "id")?.Value;
                var recorderName = User.Claims.FirstOrDefault(c => c.Type == "name")?.Value ?? "Unknown";

                // ✅ ส่ง transactionId (string) ไปให้ Service
                var result = await _borrowService.ReturnItemAsync(staffId!, recorderName, transactionId);

                return Ok(new { message = "คืนของสำเร็จ", data = result });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("history")]
        public async Task<IActionResult> History()
        {
            var staffId = User.Claims.FirstOrDefault(c => c.Type == "id")?.Value;
            var history = await _borrowService.GetMyHistoryAsync(staffId!);
            return Ok(history);
        }
    }
}