using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockApi.Dtos;
using StockApi.Services;

namespace StockApi.Controllers
{
    [Route("api/todos")]
    [ApiController]
    [Authorize]
    public class TodoController : ControllerBase
    {
        private readonly ITodoService _todoService;

        public TodoController(ITodoService todoService)
        {
            _todoService = todoService;
        }

        [HttpGet]
        public async Task<IActionResult> GetMyTodos()
        {
            var result = await _todoService.GetMyTodosAsync();
            return Ok(result);
        }

        // ✅ เพิ่ม Endpoint ดึงข้อมูลใบงานแบบเต็มตาม ID
        [HttpGet("{id}")]
        public async Task<IActionResult> GetTodoById(int id)
        {
            var result = await _todoService.GetTodoByIdAsync(id);
            return Ok(result);
        }

        [HttpPost]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> CreateTodo([FromForm] CreateTodoRequest request)
        {
            var result = await _todoService.CreateTodoAsync(request);
            return Ok(new { message = "สร้างใบงานเรียบร้อยแล้ว", data = result });
        }

        [HttpPut("{id}")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UpdateTodo(int id, [FromForm] UpdateTodoRequest request)
        {
            await _todoService.UpdateTodoAsync(id, request);
            return Ok(new { message = "แก้ไขใบงานเรียบร้อยแล้ว" });
        }

        [HttpPatch("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateTodoStatusRequest request)
        {
            await _todoService.UpdateStatusAsync(id, request);
            return Ok(new { message = "อัปเดตสถานะเรียบร้อยแล้ว" });
        }

        // 🔥 ดึงข้อมูลในถังขยะ
        [HttpGet("trash")]
        public async Task<IActionResult> GetTrash()
        {
            var result = await _todoService.GetMyTrashAsync();
            return Ok(result);
        }

        // 🔥 ลบลงถังขยะ (รองรับหลาย ID)
        // ส่ง Body: { "ids": [1, 2, 3] }
        [HttpDelete("temp-delete")]
        public async Task<IActionResult> SoftDeleteBulk([FromBody] BulkActionRequest request)
        {
            await _todoService.SoftDeleteBulkAsync(request.Ids);
            return Ok(new { message = "ย้ายลงถังขยะเรียบร้อยแล้ว" });
        }

        // 🔥 กู้คืนจากถังขยะ
        [HttpPost("trash/restore")]
        public async Task<IActionResult> RestoreBulk([FromBody] BulkActionRequest request)
        {
            await _todoService.RestoreBulkAsync(request.Ids);
            return Ok(new { message = "กู้คืนข้อมูลเรียบร้อยแล้ว" });
        }

        // 🔥 ลบถาวร (ลบด้วยตัวเอง)
        [HttpDelete("trash/permanent")]
        public async Task<IActionResult> PermanentDeleteBulk([FromBody] BulkActionRequest request)
        {
            await _todoService.PermanentDeleteBulkAsync(request.Ids);
            return Ok(new { message = "ลบข้อมูลอย่างถาวรเรียบร้อยแล้ว" });
        }

        [HttpGet("image/{fileName}")]
        [AllowAnonymous]
        public IActionResult GetImage(string fileName)
        {
            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", "Todos", fileName);

            if (!System.IO.File.Exists(filePath))
                return NotFound(new { message = "ไม่พบรูปภาพ" });

            var fileBytes = System.IO.File.ReadAllBytes(filePath);

            var ext = Path.GetExtension(fileName).ToLowerInvariant();
            string contentType = ext switch
            {
                ".png" => "image/png",
                ".gif" => "image/gif",
                ".webp" => "image/webp",
                _ => "image/jpeg"
            };

            return File(fileBytes, contentType);
        }
    }
}