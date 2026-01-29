using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace StockApi.Entities
{
    [Table("Items")]
    public class Item
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [Column("ItemCode")]
        public string ItemCode { get; set; } = string.Empty;

        [Required]
        [Column("Name")]
        public string Name { get; set; } = string.Empty;

        [Required]
        [Column("Category")]
        public string Category {  get; set; } = string.Empty;

        [Required]
        [Column("Unit")]
        public string Unit { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;
    }
}