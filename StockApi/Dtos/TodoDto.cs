using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;
using StockApi.Validations;

namespace StockApi.Dtos
{
    public class CreateTodoRequest
    {
        [Required(ErrorMessage = "กรุณาระบุ JobCode (หัวข้องาน)")]
        public string JobCode { get; set; } = string.Empty;
        public string? PcName { get; set; }

        [Required]
        public string Category { get; set; } = "Hardware";
        public string? Description { get; set; }

        // 🔥 นำ Custom Validate มาแปะตรงนี้เลย!
        // จำกัดขนาด 5MB (5 * 1024 * 1024 bytes)
        [MaxFileSize(5 * 1024 * 1024)]
        // รับเฉพาะนามสกุลรูปภาพ
        [AllowedExtensions(new string[] { ".jpg", ".jpeg", ".png", ".webp" })]
        public IFormFile? Image { get; set; }
    }

    public class UpdateTodoRequest : CreateTodoRequest
    {
        //[Required]
        //public string Status { get; set; } = string.Empty;
    }

    public class UpdateTodoStatusRequest
    {
        [Required]
        public string Status { get; set; } = string.Empty;
    }

    // 🔥 สำหรับหน้า List: ส่งเฉพาะข้อมูลจำเป็นเพื่อให้โหลดไว
    public class TodoSummaryDto
    {
        public int Id { get; set; }
        public string JobCode { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string CreatedAt { get; set; } = string.Empty;
    }

    // 🔥 สำหรับหน้า Detail: สืบทอดข้อมูลจาก Summary มาแล้วเพิ่มฟิลด์ที่เหลือลงไป
    public class TodoDetailsDto : TodoSummaryDto
    {
        public string? PcName { get; set; }
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }
        public string UpdatedAt { get; set; } = string.Empty;
    }

    public class BulkActionRequest
    {
        [Required]
        public List<int> Ids { get; set; } = new List<int>();
    }
}