using Microsoft.EntityFrameworkCore;
using StockApi.Config;
using StockApi.Entities;

namespace StockApi.Repositories
{
    public class BorrowRepository
    {
        private readonly AppDbContext _context;

        public BorrowRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<BorrowTransaction?> GetByIdAsync(int id)
        {
            return await _context.BorrowTransactions.FindAsync(id);
        }

        public async Task<List<BorrowTransaction>> GetByStaffIdAsync(string staffId)
        {
            return await _context.BorrowTransactions
                .Where(b => b.StaffId == staffId)
                .OrderByDescending(b => b.BorrowDate)
                .ToListAsync();
        }

        public async Task<BorrowTransaction?> GetByTransactionIdAsync(string transactionId)
        {
            return await _context.BorrowTransactions
                .FirstOrDefaultAsync(b => b.TransactionId == transactionId);
        }

        public async Task AddAsync(BorrowTransaction transaction)
        {
            await _context.BorrowTransactions.AddAsync(transaction);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(BorrowTransaction transaction)
        {
            _context.BorrowTransactions.Update(transaction);
            await _context.SaveChangesAsync();
        }
    }
}