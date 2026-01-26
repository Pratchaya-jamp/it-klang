using System.ComponentModel.DataAnnotations;

namespace StockApi.Dtos
{
    public class CreateItemRequest
    {
        [Required(ErrorMessage = "กรุณาระบุรหัสสินค้า")]
        public string ItemCode { get; set; } = string.Empty;

        [Required(ErrorMessage = "กรุณาระบุชื่อสินค้า")]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "กรุณาระบุหมวดหมู่")]
        public string Category { get; set; } = string.Empty;

        [Required(ErrorMessage = "กรุณาระบุหน่วยนับ")]
        public string Unit { get; set; } = string.Empty;

        [Range(0, int.MaxValue, ErrorMessage = "จำนวนต้องไม่ติดลบ")]
        public int Quantity { get; set; } = 0;
    }
}