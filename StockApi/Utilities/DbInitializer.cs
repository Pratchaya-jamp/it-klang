using StockApi.Config;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace StockApi.Utilities
{
    public static class DbInitializer
    {
        public static void Initialize(AppDbContext context)
        {
            // 1. Connect
            context.Database.CanConnect();

            // 2. Warmup Read (GET)
            var item = context.Items.AsNoTracking().FirstOrDefault();
            if (item != null)
            {
                var json = JsonSerializer.Serialize(item);
            }

            // 3. *** เพิ่มตัวนี้: Warmup Transaction (POST/PUT) ***
            // หลอกๆ เปิด Transaction แล้ว Rollback เพื่อให้ EF Core เตรียมท่อสำหรับเขียนข้อมูล
            using var transaction = context.Database.BeginTransaction();
            try
            {
                // ไม่ต้องทำอะไร แค่เปิดแล้วปิด เพื่อปลุกระบบ Transaction ให้ตื่น
                transaction.Rollback();
            }
            catch { }
        }
    }
}