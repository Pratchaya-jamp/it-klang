namespace StockApi.Dtos
{
    public class StockBalanceDto
    {
        public string ItemCode { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Unit { get; set; } = string.Empty;

        public int TotalQuantity { get; set; }
        public int Received { get; set; }
        public int TempWithdrawn { get; set; }
        public int Balance { get; set; }
    }
}