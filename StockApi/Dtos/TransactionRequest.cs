using System.ComponentModel.DataAnnotations;

namespace StockApi.Dtos
{
    public class TransactionRequest
    {
        [Required]
        public string ItemCode { get; set; } = string.Empty;

        [Required(ErrorMessage = "กรุณาระบุรหัสอ้างอิง Job (Job No)")]
        public string JobNo { get; set; } = string.Empty;

        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "จำนวนต้องมากกว่า 0")]
        public int Quantity { get; set; }

        public string Note { get; set; } = string.Empty;

        // [Required]
        // public string CreatedBy { get; set; } = string.Empty; // รับชื่อคนทำรายการ (เดี๋ยวค่อยเปลี่ยนเป็น Auto จาก Token ทีหลัง)
    }

    public class WriteOffRequest
    {
        [Required]
        public string ItemCode { get; set; } = string.Empty;

        [Required(ErrorMessage = "กรุณาระบุรหัสอ้างอิง Job (Job No)")]
        public string JobNo { get; set; } = string.Empty;

        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "จำนวนต้องมากกว่า 0")]
        public int Quantity { get; set; }

        [Required(ErrorMessage = "ต้องระบุเหตุผลในการตัดจำหน่ายทุกครั้ง")]
        public string Note { get; set; } = string.Empty;
    }

    public class WriteOffSummaryDto
    {
        public string ItemCode { get; set; } = string.Empty;
        public string ItemName { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;

        public int TotalWriteOff { get; set; } // จำนวนชิ้นรวมที่ถูกตัดทิ้ง
        public string LastWriteOffDate { get; set; } = string.Empty; // วันที่ตัดทิ้งล่าสุด
    }
}