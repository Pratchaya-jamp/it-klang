using Microsoft.EntityFrameworkCore;
using StockApi.Entities;
using StockApi.Utilities;
using Microsoft.Extensions.DependencyInjection;
using StockApi.Config;

namespace StockApi.Data
{
    public static class DataSeeder
    {
        public static async Task SeedUsersAsync(IServiceProvider serviceProvider)
        {
            using var scope = serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            // ==========================================
            // 1. Seed SuperAdmin
            // ==========================================
            var adminId = Environment.GetEnvironmentVariable("SUPER_ADMIN_ID");
            var adminPass = Environment.GetEnvironmentVariable("SUPER_ADMIN_PASS");
            var adminName = Environment.GetEnvironmentVariable("SUPER_ADMIN_NAME");
            var adminEmail = Environment.GetEnvironmentVariable("SUPER_ADMIN_EMAIL");

            if (!string.IsNullOrEmpty(adminId) && !string.IsNullOrEmpty(adminPass))
            {
                if (!await context.Users.AnyAsync(u => u.StaffId == adminId))
                {
                    var superAdmin = new User
                    {
                        StaffId = adminId,
                        Name = adminName ?? "Super Admin",
                        Email = adminEmail ?? "admin@cosmo.co.th",
                        Role = "SuperAdmin",
                        PasswordHash = PasswordHasher.HashPassword(adminPass),
                        IsForceChangePassword = false,
                        CreatedAt = DateTime.Now
                    };
                    context.Users.Add(superAdmin);
                    await context.SaveChangesAsync();
                    Console.WriteLine($"✅ Seeded SuperAdmin: {adminId} Successfully!");
                }
            }
            else
            {
                Console.WriteLine("⚠️ SuperAdmin Seeding Skipped: Missing Environment Variables.");
            }

            // ==========================================
            // 2. Seed WebSupporter (เช็คจาก Role)
            // ==========================================
            // ตรวจสอบว่ามี Role "WebSupporter" ในระบบหรือยัง ถ้ายังไม่มีให้สร้าง
            if (!await context.Users.AnyAsync(u => u.Role == "WebSupporter"))
            {
                // ดึงค่าจาก Env (ถ้าไม่มีการตั้งค่าไว้ จะใช้ค่า Default ที่กำหนดให้ด้านหลัง)
                var supId = Environment.GetEnvironmentVariable("WEB_SUPPORTER_ID") ?? "SUP001";
                var supPass = Environment.GetEnvironmentVariable("WEB_SUPPORTER_PASS") ?? "support1234";
                var supName = Environment.GetEnvironmentVariable("WEB_SUPPORTER_NAME") ?? "IT Support Team";
                var supEmail = Environment.GetEnvironmentVariable("WEB_SUPPORTER_EMAIL") ?? "support@cosmo.co.th";

                var webSupporter = new User
                {
                    StaffId = supId,
                    Name = supName,
                    Email = supEmail,
                    Role = "WebSupporter",
                    PasswordHash = PasswordHasher.HashPassword(supPass),
                    IsForceChangePassword = false, // กำหนดเป็น false ไปเลยจะได้พร้อมใช้งานเทสต์ได้ทันที
                    CreatedAt = DateTime.Now
                };

                context.Users.Add(webSupporter);
                await context.SaveChangesAsync();
                Console.WriteLine($"✅ Seeded WebSupporter: {supId} Successfully!");
            }
        }
    }
}