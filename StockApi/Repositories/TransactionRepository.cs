using StockApi.Config;
using StockApi.Entities;

namespace StockApi.Repositories
{
    public interface ITransactionRepository
    {
        Task AddTransactionAsync(StockTransaction transaction);
    }

    public class TransactionRepository : ITransactionRepository
    {
        private readonly AppDbContext _context;

        public TransactionRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task AddTransactionAsync(StockTransaction transaction)
        {
            _context.StockTransactions.Add(transaction);
            // ยังไม่ SaveChanges ตรงนี้นะครับ เดี๋ยวไป Save พร้อมตัดสต็อกใน Service (เพื่อความชัวร์แบบ Transaction)
        }
    }
}