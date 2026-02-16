using Microsoft.EntityFrameworkCore;
using StockApi.Entities;
using StockApi.Utilities;
using Microsoft.Extensions.Configuration; // <--- เพิ่ม using
using Microsoft.Extensions.DependencyInjection; // <--- เพิ่มตัวนี้ (สำหรับ GetRequiredService)
using StockApi.Config;

namespace StockApi.Data
{
    public static class DataSeeder
    {
        public static async Task SeedUsersAsync(IServiceProvider serviceProvider)
        {
            using var scope = serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            // ไม่ต้องใช้ IConfiguration แล้ว ลบหรือ comment ทิ้งได้เลย
            // var config = scope.ServiceProvider.GetRequiredService<IConfiguration>(); 

            // *** แก้ตรงนี้: อ่านจาก Environment ตรงๆ ***
            var staffId = Environment.GetEnvironmentVariable("SUPER_ADMIN_ID");
            var password = Environment.GetEnvironmentVariable("SUPER_ADMIN_PASS");
            var name = Environment.GetEnvironmentVariable("SUPER_ADMIN_NAME");
            var email = Environment.GetEnvironmentVariable("SUPER_ADMIN_EMAIL");

            // เช็คค่า (Debug ดูว่าอ่านเจอไหม)
            if (string.IsNullOrEmpty(staffId) || string.IsNullOrEmpty(password))
            {
                // เพิ่ม Log ให้เห็นชัดๆ ว่าอ่านค่าได้อะไรมาบ้าง
                Console.WriteLine($"⚠️ Seeding Failed. Env Vars -> ID: '{staffId}', Pass: '{password}'");
                return;
            }

            // ... (ส่วน Logic เช็คและสร้าง User เหมือนเดิม) ...
            if (await context.Users.AnyAsync(u => u.StaffId == staffId)) return;

            var superAdmin = new User
            {
                StaffId = staffId,
                Name = name ?? "Super Admin",
                Email = email ?? "admin@stockapi.com", // (ระวัง typo: gmail.ocm -> .com)
                Role = "SuperAdmin",
                PasswordHash = PasswordHasher.HashPassword(password),
                IsForceChangePassword = false,
                CreatedAt = DateTime.Now
            };

            context.Users.Add(superAdmin);
            await context.SaveChangesAsync();

            Console.WriteLine($"✅ Seeded SuperAdmin: {staffId} Successfully!");
        }
    }
}