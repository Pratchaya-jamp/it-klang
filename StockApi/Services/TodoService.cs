using StockApi.Dtos;
using StockApi.Entities;
using StockApi.Exceptions;
using StockApi.Repositories;
using Microsoft.AspNetCore.Http;
using SkiaSharp;

namespace StockApi.Services
{
    public interface ITodoService
    {
        Task<List<TodoSummaryDto>> GetMyTodosAsync(); // ✅ เปลี่ยนเป็น Summary
        Task<List<TodoSummaryDto>> GetMyTrashAsync();
        Task<TodoDetailsDto> GetTodoByIdAsync(int id); // ✅ เพิ่มฟังก์ชันดึงรายตัว
        Task<TodoDetailsDto> CreateTodoAsync(CreateTodoRequest request);
        Task UpdateTodoAsync(int id, UpdateTodoRequest request);
        Task UpdateStatusAsync(int id, UpdateTodoStatusRequest request);
        Task SoftDeleteBulkAsync(List<int> ids); // ลบลงถังขยะ (ทีละหลายตัว)
        Task RestoreBulkAsync(List<int> ids); // กู้คืน (ทีละหลายตัว)
        Task PermanentDeleteBulkAsync(List<int> ids); // ลบถาวร (ทีละหลายตัว)

        Task ClearExpiredTrashJobAsync(); // สำหรับ Hangfire เรียกใช้
    }

    public class TodoService : ITodoService
    {
        private readonly ITodoRepository _repo;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly string _uploadFolder;

        public TodoService(ITodoRepository repo, IHttpContextAccessor httpContextAccessor)
        {
            _repo = repo;
            _httpContextAccessor = httpContextAccessor;
            _uploadFolder = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", "Todos");
        }

        private string GetCurrentStaffId()
        {
            var staffId = _httpContextAccessor.HttpContext?.User?.FindFirst("id")?.Value;
            if (string.IsNullOrEmpty(staffId)) throw new UnauthorizedAccessException("ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่");
            return staffId;
        }

        private TodoSummaryDto MapToSummaryDto(TodoTask x)
        {
            return new TodoSummaryDto
            {
                Id = x.Id,
                JobCode = x.JobCode,
                Category = x.Category,
                Status = x.Status,
                CreatedAt = x.CreatedAt.ToString("dd/MM/yyyy HH:mm")
            };
        }

        // 🔥 เปลี่ยนเป็น MapToDetailsDto
        private TodoDetailsDto MapToDetailsDto(TodoTask x)
        {
            var req = _httpContextAccessor.HttpContext?.Request;
            var baseUrl = $"{req?.Scheme}://{req?.Host.Value}";

            return new TodoDetailsDto
            {
                Id = x.Id,
                JobCode = x.JobCode,
                PcName = x.PcName,
                Category = x.Category,
                Description = x.Description,
                ImageUrl = !string.IsNullOrEmpty(x.ImageName) ? $"/api/todos/image/{x.ImageName}" : null, // ปรับ Path ให้ตรงกับ Controller
                Status = x.Status,
                CreatedAt = x.CreatedAt.ToString("dd/MM/yyyy HH:mm"),
                UpdatedAt = x.UpdatedAt.ToString("dd/MM/yyyy HH:mm")
            };
        }

        private async Task<string> ProcessAndSaveImageAsync(IFormFile file)
        {
            if (!Directory.Exists(_uploadFolder)) Directory.CreateDirectory(_uploadFolder);

            string fileName = $"{Guid.NewGuid()}.jpg";
            var filePath = Path.Combine(_uploadFolder, fileName);

            using var stream = file.OpenReadStream();
            using var originalBitmap = SKBitmap.Decode(stream);

            if (originalBitmap == null) throw new Exception("ไฟล์ภาพไม่ถูกต้อง");

            SKBitmap bitmapToSave = originalBitmap;
            bool isResized = false;

            if (originalBitmap.Width > 800)
            {
                int newWidth = 800;
                int newHeight = (int)((800f / originalBitmap.Width) * originalBitmap.Height);

                var imageInfo = new SKImageInfo(newWidth, newHeight);
                bitmapToSave = originalBitmap.Resize(imageInfo, new SKSamplingOptions(SKFilterMode.Linear)); ;
                isResized = true;
            }

            using var image = SKImage.FromBitmap(bitmapToSave);
            using var data = image.Encode(SKEncodedImageFormat.Jpeg, 75);

            using var fileStream = File.OpenWrite(filePath);
            data.SaveTo(fileStream);

            if (isResized)
            {
                bitmapToSave.Dispose();
            }

            return fileName;
        }

        public async Task<List<TodoSummaryDto>> GetMyTodosAsync()
        {
            string staffId = GetCurrentStaffId();
            var todos = await _repo.GetMyTodosAsync(staffId);
            return todos.Select(MapToSummaryDto).ToList(); // ใช้ฟังก์ชันแปลงเป็น Summary
        }

        public async Task<List<TodoSummaryDto>> GetMyTrashAsync()
        {
            string staffId = GetCurrentStaffId();
            var todos = await _repo.GetMyTrashAsync(staffId);
            return todos.Select(MapToSummaryDto).ToList();
        }

        // ✅ ฟังก์ชันใหม่สำหรับดึงข้อมูลรายตัว
        public async Task<TodoDetailsDto> GetTodoByIdAsync(int id)
        {
            string staffId = GetCurrentStaffId();
            var todo = await _repo.GetTodoByIdAndStaffAsync(id, staffId);

            if (todo == null) throw new NotFoundException("ไม่พบรายการใบงานนี้ หรือคุณไม่มีสิทธิ์เข้าถึง");

            return MapToDetailsDto(todo);
        }

        public async Task<TodoDetailsDto> CreateTodoAsync(CreateTodoRequest request)
        {
            string staffId = GetCurrentStaffId();
            string? fileName = null;

            if (request.Image != null && request.Image.Length > 0)
            {
                fileName = await ProcessAndSaveImageAsync(request.Image);
            }

            // 🔥 1. ระบบสุ่ม ID ใหม่แบบ 8 หลัก และเช็คไม่ให้ซ้ำกับใน Database
            int newId;
            do
            {
                newId = Random.Shared.Next(10000000, 99999999);
            }
            while (await _repo.IsIdExistsAsync(newId)); // ถ้าเลขซ้ำ ให้วนสุ่มใหม่จนกว่าจะไม่ซ้ำ

            var todo = new TodoTask
            {
                Id = newId, // 🔥 2. ยัด ID ที่สุ่มได้ใส่ลงไป
                StaffId = staffId,
                JobCode = request.JobCode,
                PcName = request.PcName,
                Category = request.Category,
                Description = request.Description,
                ImageName = fileName,
                Status = "TODO",
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            await _repo.AddTodoAsync(todo);
            return MapToDetailsDto(todo);
        }

        public async Task UpdateTodoAsync(int id, UpdateTodoRequest request)
        {
            string staffId = GetCurrentStaffId();
            var todo = await _repo.GetTodoByIdAndStaffAsync(id, staffId);
            if (todo == null) throw new NotFoundException("ไม่พบรายการ หรือคุณไม่มีสิทธิ์แก้ไขรายการนี้");

            if (request.Image != null && request.Image.Length > 0)
            {
                if (!string.IsNullOrEmpty(todo.ImageName))
                {
                    var oldPath = Path.Combine(_uploadFolder, todo.ImageName);
                    if (File.Exists(oldPath)) File.Delete(oldPath);
                }

                todo.ImageName = await ProcessAndSaveImageAsync(request.Image);
            }

            todo.JobCode = request.JobCode;
            todo.PcName = request.PcName;
            todo.Category = request.Category;
            todo.Description = request.Description;
            //todo.Status = request.Status;
            todo.UpdatedAt = DateTime.Now;

            await _repo.UpdateTodoAsync(todo);
        }

        public async Task UpdateStatusAsync(int id, UpdateTodoStatusRequest request)
        {
            string staffId = GetCurrentStaffId();
            var todo = await _repo.GetTodoByIdAndStaffAsync(id, staffId);
            if (todo == null) throw new NotFoundException("ไม่พบรายการ หรือคุณไม่มีสิทธิ์แก้ไขรายการนี้");

            todo.Status = request.Status;
            todo.UpdatedAt = DateTime.Now;

            await _repo.UpdateTodoAsync(todo);
        }

        // 🗑️ 1. ลบชั่วคราว (ลงถังขยะ)
        public async Task SoftDeleteBulkAsync(List<int> ids)
        {
            string staffId = GetCurrentStaffId();
            var todos = await _repo.GetTodosByIdsAndStaffAsync(ids, staffId);

            foreach (var todo in todos)
            {
                todo.DeletedAt = DateTime.Now; // ประทับตราว่าลบแล้ว
            }
            // สามารถใช้ UpdateTodoAsync ใน Repo วนลูป หรือให้ดีต้องใช้ BulkUpdate ของ EF 
            // แต่เนื่องจากมีไม่กี่รายการ ลูปเซฟได้เลย (หรือใช้ _context.SaveChangesAsync ใน Repo)
            foreach (var t in todos) await _repo.UpdateTodoAsync(t);
        }

        // ♻️ 2. กู้คืนจากถังขยะ
        public async Task RestoreBulkAsync(List<int> ids)
        {
            string staffId = GetCurrentStaffId();
            var todos = await _repo.GetTodosByIdsAndStaffAsync(ids, staffId);

            foreach (var todo in todos)
            {
                todo.DeletedAt = null; // ปลดป้ายถังขยะออก
            }
            foreach (var t in todos) await _repo.UpdateTodoAsync(t);
        }

        // 💥 3. ลบถาวร (พร้อมทำลายไฟล์รูป) - ลบด้วยตัวเอง
        public async Task PermanentDeleteBulkAsync(List<int> ids)
        {
            string staffId = GetCurrentStaffId();
            var todos = await _repo.GetTodosByIdsAndStaffAsync(ids, staffId);

            foreach (var todo in todos)
            {
                if (!string.IsNullOrEmpty(todo.ImageName))
                {
                    var filePath = Path.Combine(_uploadFolder, todo.ImageName);
                    if (File.Exists(filePath)) File.Delete(filePath);
                }
            }

            await _repo.DeleteTodosAsync(todos);
        }

        // ⏳ 4. ฟังก์ชันสำหรับ Hangfire (ลบขยะที่อายุเกิน 30 วันอัตโนมัติ)
        // สังเกตว่าฟังก์ชันนี้จะ *ไม่ใช้* GetCurrentStaffId() เพราะทำงานอยู่เบื้องหลัง ไม่มีใคร Login
        public async Task ClearExpiredTrashJobAsync()
        {
            var expiredDate = DateTime.Now.AddDays(-30);
            var expiredTodos = await _repo.GetExpiredTrashAsync(expiredDate);

            foreach (var todo in expiredTodos)
            {
                if (!string.IsNullOrEmpty(todo.ImageName))
                {
                    var filePath = Path.Combine(_uploadFolder, todo.ImageName);
                    if (File.Exists(filePath)) File.Delete(filePath);
                }
            }

            await _repo.DeleteTodosAsync(expiredTodos);
        }
    }
}