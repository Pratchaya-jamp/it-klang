using Microsoft.EntityFrameworkCore;
using StockApi.Entities;

namespace StockApi.Config
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Item> Items { get; set; }
        public DbSet<StockBalance> StockBalances { get; set; }
        public DbSet<StockTransaction> StockTransactions { get; set; }
        public DbSet<SystemLog> SystemLogs { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<UserAuditLog> UserAuditLogs { get; set; }
        public DbSet<BorrowTransaction> BorrowTransactions { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // 1. ระบุชัดๆ ไปเลยว่า ItemCode คือ Primary Key (Key หลัก) ของตาราง Item
            // เพื่อไม่ให้ EF Core เผลอไปใช้ Id (int)
            modelBuilder.Entity<Item>()
                .HasKey(i => i.ItemCode);

            // 2. ระบุความสัมพันธ์ 1-ต่อ-1
            modelBuilder.Entity<Item>()
                .HasOne(i => i.StockBalance)
                .WithOne(s => s.Item)
                .HasForeignKey<StockBalance>(s => s.ItemCode); // เชื่อมด้วย ItemCode (String) ทั้งคู่
        }
    }
}