using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace StockApi.Entities
{
    public class TodoTask
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.None)] // 🔥 สั่งปิด Auto Increment
        public int Id { get; set; }
        public string StaffId { get; set; } = string.Empty;
        public string JobCode { get; set; } = string.Empty;
        public string? PcName { get; set; }
        public string Category { get; set; } = "Hardware";
        public string? Description { get; set; }
        public string? ImageName { get; set; }
        public string Status { get; set; } = "TODO";
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;
        public DateTime? DeletedAt { get; set; }
    }
}