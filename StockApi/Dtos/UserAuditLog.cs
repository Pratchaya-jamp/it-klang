using System.ComponentModel.DataAnnotations;

namespace StockApi.Entities
{
    public class UserAuditLog
    {
        public int Id { get; set; }

        [MaxLength(50)]
        public string StaffId { get; set; } = string.Empty; // User ที่ Login

        [MaxLength(50)]
        public string Action { get; set; } = string.Empty;  // "LOGIN_SUCCESS" หรือ "LOGIN_FAILED"

        public bool IsSuccess { get; set; }                 // true/false

        public string Note { get; set; } = string.Empty;    // เหตุผล (เช่น รหัสผิด, Token หมดอายุ)

        [MaxLength(50)]
        public string IpAddress { get; set; } = string.Empty; // IP เครื่องลูกค้า

        [MaxLength(500)]
        public string UserAgent { get; set; } = string.Empty; // Browser/Device รุ่นไหน

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}