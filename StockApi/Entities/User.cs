using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace StockApi.Entities
{
    [Table("Users")]
    public class User
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string StaffId { get; set; } = string.Empty; // รหัสพนักงาน (ใช้ Login)

        [Required]
        public string Name { get; set; } = string.Empty;

        [Required]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Role { get; set; } = "User"; // User, Admin

        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        public bool IsForceChangePassword { get; set; } = true; // True = ต้องเปลี่ยนรหัสก่อนใช้งาน

        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}