using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace StockApi.Entities
{
    [Table("BorrowTransactions")]
    public class BorrowTransaction
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string TransactionId { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string StaffId { get; set; } = string.Empty;

        // ✅ เพิ่ม: ชื่อผู้บันทึก
        [MaxLength(255)]
        public string RecorderName { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string ItemCode { get; set; } = string.Empty;

        // ✅ เพิ่ม: ชื่อสินค้า (เก็บไว้เป็นประวัติ เผื่อชื่อสินค้าเปลี่ยน)
        [MaxLength(255)]
        public string ItemName { get; set; } = string.Empty;

        public int Quantity { get; set; }

        // ✅ เพิ่ม: Job ID
        [MaxLength(50)]
        public string? JobId { get; set; }

        public string? HangfireJobId { get; set; }

        public DateTime BorrowDate { get; set; } = DateTime.Now;
        public DateTime? ReturnDate { get; set; }

        // ✅ ใช้เก็บ "เวลาที่จะคืน" ที่กรอกมา
        public DateTime? DueDate { get; set; }

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Borrowed";

        public string? Note { get; set; }
    }
}