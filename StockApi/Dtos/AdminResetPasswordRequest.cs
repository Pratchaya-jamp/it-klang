using System.ComponentModel.DataAnnotations;

namespace StockApi.Dtos
{
    public class AdminResetPasswordRequest
    {
        [Required(ErrorMessage = "กรุณาระบุ Staff ID ของผู้ใช้ที่ต้องการรีเซ็ต")]
        public string TargetStaffId { get; set; } = string.Empty; // ID ของคนที่จะโดนแก้

        [Required(ErrorMessage = "กรุณาระบุรหัสผ่านใหม่")]
        [MinLength(6, ErrorMessage = "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร")]
        public string NewPassword { get; set; } = string.Empty;   // รหัสใหม่ที่ Admin ตั้งให้

        [Required(ErrorMessage = "กรุณาระบุOTPที่ได้รับ")]
        public string? OtpCode { get; set; } // เพิ่มช่องรับ OTP

    }
}