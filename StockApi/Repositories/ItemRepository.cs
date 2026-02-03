using Microsoft.EntityFrameworkCore;
using StockApi.Config;
using StockApi.Entities;

namespace StockApi.Repositories
{
    public interface IItemRepository
    {
        // เพิ่ม variant
        Task<List<Item>> GetDashboardItemsAsync(string? searchId, string? category, string? keyword, string? variant);
        Task<Item?> GetItemByCodeAsync(string itemCode); // หา Item รายตัว
        Task UpdateItemAsync(Item item);                 // สั่ง Save ค่าที่แก้
        Task DeleteItemAsync(string itemCode);
    }

    public class ItemRepository : IItemRepository
    {
        private readonly AppDbContext _context;

        public ItemRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<Item>> GetDashboardItemsAsync(string? searchId, string? category, string? keyword, string? variant)
        {
            var query = _context.Items.AsQueryable();

            // 1. Category (หมวดหมู่)
            if (!string.IsNullOrEmpty(category))
                query = query.Where(x => x.Category == category);

            // 2. Variant (สเปคย่อย: USB, 500GB, DDR4) **ของใหม่**
            // ใช้ Contains เหมือนกัน เพราะค่าพวกนี้ฝังอยู่ในชื่อ
            if (!string.IsNullOrEmpty(variant))
                query = query.Where(x => x.Name.ToLower().Contains(variant.ToLower()));

            // 3. Keyword (คำค้นหาชื่อเพิ่มเติม เช่น ยี่ห้อ)
            if (!string.IsNullOrEmpty(keyword))
                query = query.Where(x => x.Name.ToLower().Contains(keyword.ToLower()));

            // 4. SearchId (รหัสสินค้า)
            if (!string.IsNullOrEmpty(searchId))
                query = query.Where(x => x.ItemCode.ToLower().Contains(searchId.ToLower()));

            return await query.OrderByDescending(x => x.CreatedAt).ToListAsync();
        }

        public async Task<Item?> GetItemByCodeAsync(string itemCode)
        {
            return await _context.Items
                .Include(x => x.StockBalance) // จอยมาด้วยเพื่อเช็คยอด
                .FirstOrDefaultAsync(x => x.ItemCode == itemCode);
        }

        // 2. บันทึกการแก้ไข
        public async Task UpdateItemAsync(Item item)
        {
            _context.Items.Update(item);
            await _context.SaveChangesAsync();
        }

        // 3. ลบสินค้า (ลบทั้ง Item และ StockBalance ของตัวนั้น)
        public async Task DeleteItemAsync(string itemCode)
        {
            // ลบ StockBalance ก่อน (เนื่องจาก FK)
            var stock = await _context.StockBalances.FirstOrDefaultAsync(x => x.ItemCode == itemCode);
            if (stock != null) _context.StockBalances.Remove(stock);

            // ลบ Item
            var item = await _context.Items.FirstOrDefaultAsync(x => x.ItemCode == itemCode);
            if (item != null) _context.Items.Remove(item);

            await _context.SaveChangesAsync();
        }
    }
}