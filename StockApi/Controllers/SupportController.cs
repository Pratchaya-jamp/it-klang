using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockApi.Dtos;
using StockApi.Services;
using System.Security.Claims;

namespace StockApi.Controllers
{
    [Route("api/support")]
    [ApiController]
    [Authorize]
    public class SupportController : ControllerBase
    {
        private readonly ISupportService _supportService;

        public SupportController(ISupportService supportService)
        {
            _supportService = supportService;
        }

        // POST: api/support/ticket (User ทั่วไปใช้ส่งปัญหา)
        [HttpPost("ticket")]
        public async Task<IActionResult> CreateTicket([FromBody] CreateSupportRequest request)
        {
            try
            {
                var staffId = User.FindFirst("id")?.Value;
                if (string.IsNullOrEmpty(staffId)) return Unauthorized();

                await _supportService.CreateTicketAsync(staffId, request);
                return StatusCode(201, new { message = "ส่งข้อมูลแจ้งปัญหาเรียบร้อยแล้ว ทีมงานจะรีบตรวจสอบให้เร็วที่สุดครับ" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: api/support/tickets (WebSupporter หรือ Admin ใช้ดูรายการ)
        [HttpGet("tickets")]
        public async Task<IActionResult> GetTickets()
        {
            try
            {
                var role = User.FindFirst("role")?.Value;

                // ให้ดูได้เฉพาะ WebSupporter และ SuperAdmin
                if (role != "WebSupporter")
                {
                    return StatusCode(403, new { message = "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้" });
                }

                var tickets = await _supportService.GetAllTicketsAsync();
                return Ok(new { data = tickets, count = tickets.Count });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}