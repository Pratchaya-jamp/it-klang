using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace StockApi.Entities
{
    [Table("StockBalances")]
    public class StockBalance
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [Column("ItemCode")]
        public string ItemCode { get; set; } = string.Empty;

        public int TotalQuantity { get; set; }
        public int TempReceived { get; set; }
        public int TempWithdrawn { get; set; }
        public int Balance { get; set; }

        [ForeignKey("ItemCode")]
        public Item? Item { get; set; }
    }
}