using System.ComponentModel.DataAnnotations;

namespace StockApi.Dtos
{
    public class UpdateItemRequest
    {
        [Required] public string Name { get; set; } = string.Empty;
        [Required] public string Category { get; set; } = string.Empty;
        [Required] public string Unit { get; set; } = string.Empty;
    }
}