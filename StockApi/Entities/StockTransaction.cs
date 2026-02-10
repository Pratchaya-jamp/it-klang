using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace StockApi.Entities
{
    [Table("StockTransactions")]
    public class StockTransaction
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string TransactionNo { get; set; } = string.Empty; // เลขที่เอกสาร (เช่น TRX-20260210-001)

        [Required]
        public string ItemCode { get; set; } = string.Empty;

        [Required]
        public string Type { get; set; } = string.Empty; // "IN" หรือ "OUT"

        public int Quantity { get; set; } // จำนวนที่ขยับ
        public int BalanceAfter { get; set; } // ยอดคงเหลือหลังขยับ (Snapshot)

        public string Note { get; set; } = string.Empty; // หมายเหตุ (เช่น เบิกไปใช้ที่ Office)
        public string CreatedBy { get; set; } = string.Empty; // Log: ใครทำ?
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        // FK เชื่อมไปหา Item
        [ForeignKey("ItemCode")]
        public Item? Item { get; set; }
    }
}