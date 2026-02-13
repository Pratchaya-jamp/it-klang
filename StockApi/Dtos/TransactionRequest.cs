using System.ComponentModel.DataAnnotations;

namespace StockApi.Dtos
{
    public class TransactionRequest
    {
        [Required]
        public string ItemCode { get; set; } = string.Empty;

        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "จำนวนต้องมากกว่า 0")]
        public int Quantity { get; set; }

        public string Note { get; set; } = string.Empty;

        // [Required]
        // public string CreatedBy { get; set; } = string.Empty; // รับชื่อคนทำรายการ (เดี๋ยวค่อยเปลี่ยนเป็น Auto จาก Token ทีหลัง)
    }
}