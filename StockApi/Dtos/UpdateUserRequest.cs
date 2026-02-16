using System.ComponentModel.DataAnnotations;

namespace StockApi.Dtos
{
    // 1. สำหรับ User แก้ไขข้อมูลตัวเอง
    public class UserUpdateProfileRequest
    {
        [Required(ErrorMessage = "กรุณาระบุชื่อ")]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "กรุณาระบุอีเมล")]
        [EmailAddress(ErrorMessage = "รูปแบบอีเมลไม่ถูกต้อง")]
        public string Email { get; set; } = string.Empty;
    }

    // 2. สำหรับ SuperAdmin แก้ไขข้อมูลคนอื่น
    public class AdminUpdateUserRequest
    {
        [Required]
        public string Name { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        // Admin สามารถแก้ Role ได้
        [Required]
        public string Role { get; set; } = string.Empty;

        // (Optional) เผื่ออนาคตอยากทำระบบแบน User
        public bool IsActive { get; set; } = true;
    }
}