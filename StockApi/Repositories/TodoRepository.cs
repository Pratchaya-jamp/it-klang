using Microsoft.EntityFrameworkCore;
using StockApi.Config;
using StockApi.Entities;

namespace StockApi.Repositories
{
    public interface ITodoRepository
    {
        Task<List<TodoTask>> GetMyTodosAsync(string staffId);
        Task<List<TodoTask>> GetMyTrashAsync(string staffId); // ดึงรายการถังขยะ
        Task<TodoTask?> GetTodoByIdAndStaffAsync(int id, string staffId);
        Task<List<TodoTask>> GetTodosByIdsAndStaffAsync(List<int> ids, string staffId); // ดึงหลายรายการ
        Task AddTodoAsync(TodoTask todo);
        Task UpdateTodoAsync(TodoTask todo);
        Task DeleteTodoAsync(TodoTask todo);
        Task DeleteTodosAsync(List<TodoTask> todos); // ลบถาวรหลายรายการ
        Task<bool> IsIdExistsAsync(int id);

        // สำหรับ Background Job (Hangfire) ดึงขยะที่หมดอายุของทุกคน
        Task<List<TodoTask>> GetExpiredTrashAsync(DateTime expiredDate);
    }

    public class TodoRepository : ITodoRepository
    {
        private readonly AppDbContext _context;

        public TodoRepository(AppDbContext context) { _context = context; }

        public async Task<List<TodoTask>> GetMyTodosAsync(string staffId)
        {
            // 🔥 ดึงเฉพาะที่ยังไม่ลบ (DeletedAt == null)
            return await _context.TodoTasks
                .Where(x => x.StaffId == staffId && x.DeletedAt == null)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();
        }

        public async Task<List<TodoTask>> GetMyTrashAsync(string staffId)
        {
            // 🔥 ดึงเฉพาะที่อยู่ในถังขยะ (DeletedAt != null)
            return await _context.TodoTasks
                .Where(x => x.StaffId == staffId && x.DeletedAt != null)
                .OrderByDescending(x => x.DeletedAt)
                .ToListAsync();
        }

        public async Task<TodoTask?> GetTodoByIdAndStaffAsync(int id, string staffId)
        {
            return await _context.TodoTasks.FirstOrDefaultAsync(x => x.Id == id && x.StaffId == staffId);
        }

        public async Task<List<TodoTask>> GetTodosByIdsAndStaffAsync(List<int> ids, string staffId)
        {
            return await _context.TodoTasks.Where(x => x.StaffId == staffId && ids.Contains(x.Id)).ToListAsync();
        }

        public async Task AddTodoAsync(TodoTask todo) { _context.TodoTasks.Add(todo); await _context.SaveChangesAsync(); }

        public async Task UpdateTodoAsync(TodoTask todo) { _context.TodoTasks.Update(todo); await _context.SaveChangesAsync(); }

        public async Task DeleteTodoAsync(TodoTask todo) { _context.TodoTasks.Remove(todo); await _context.SaveChangesAsync(); }

        public async Task DeleteTodosAsync(List<TodoTask> todos) { _context.TodoTasks.RemoveRange(todos); await _context.SaveChangesAsync(); }

        public async Task<List<TodoTask>> GetExpiredTrashAsync(DateTime expiredDate)
        {
            return await _context.TodoTasks.Where(x => x.DeletedAt != null && x.DeletedAt <= expiredDate).ToListAsync();
        }

        public async Task<bool> IsIdExistsAsync(int id)
        {
            return await _context.TodoTasks.AnyAsync(x => x.Id == id);
        }
    }
}