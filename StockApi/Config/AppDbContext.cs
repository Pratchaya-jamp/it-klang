using Microsoft.EntityFrameworkCore;
using StockApi.Entities;

namespace StockApi.Config
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Item> Items { get; set; }
        public DbSet<StockBalance> StockBalances { get; set; }
        // public DbSet<StockTransaction> StockTransactions { get; set; } // ถ้ายังไม่ใช้ คอมเมนต์ไว้ก่อนได้

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Config ความสัมพันธ์: เชื่อมกันด้วย ItemCode (String)
            modelBuilder.Entity<StockBalance>()
                .HasOne(s => s.Item)
                .WithMany()
                .HasForeignKey(s => s.ItemCode)
                .HasPrincipalKey(i => i.ItemCode);
        }
    }
}