using Microsoft.EntityFrameworkCore;
using StockApi.Entities;

namespace StockApi.Config
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Item> Items { get; set; }
        public DbSet<StockBalance> StockBalances { get; set; }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // บอก EF Core ว่า: การเชื่อมตารางนี้ ให้ใช้ ItemCode เป็นตัวเชื่อมนะ (ไม่ใช่ Id)
            modelBuilder.Entity<StockBalance>()
                .HasOne(s => s.Item)                // StockBalance มี 1 Item
                .WithMany()                         // Item มีหลาย StockBalance ได้ (หรือจะ WithOne ก็ได้)
                .HasForeignKey(s => s.ItemCode)     // FK คือ StockBalance.ItemCode
                .HasPrincipalKey(i => i.ItemCode);  // **สำคัญ:** เป้าหมายคือ Item.ItemCode (ที่เป็น String เหมือนกัน)
        }
    }
}