using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace StockApi.Entities
{
    [Table("NotificationReads")]
    public class NotificationRead
    {
        [Key]
        public int Id { get; set; }
        public int NotificationId { get; set; }
        public string StaffId { get; set; } = string.Empty;
        public DateTime ReadAt { get; set; } = DateTime.Now;
    }
}