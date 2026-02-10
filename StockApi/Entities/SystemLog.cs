using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace StockApi.Entities
{
    [Table("SystemAuditLogs")]
    public class SystemLog
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Action { get; set; } = string.Empty; // CREATE, UPDATE, DELETE, STOCK_IN, STOCK_OUT

        [Required]
        public string TableName { get; set; } = string.Empty; // Items, StockBalances

        [Required]
        public string RecordId { get; set; } = string.Empty; // ItemCode หรือ ID ที่ถูกกระทำ

        public string? OldValue { get; set; } // ค่าเดิม (ก่อนแก้) - เก็บเป็น JSON หรือ Text
        public string? NewValue { get; set; } // ค่าใหม่ (หลังแก้)

        [Required]
        public string CreatedBy { get; set; } = string.Empty; // ใครทำ

        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}