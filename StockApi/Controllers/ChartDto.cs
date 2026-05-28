namespace StockApi.Dtos
{
    // สำหรับกราฟที่ 1: ยอดคงเหลือแต่ละหมวดหมู่
    public class CategoryBalanceChartDto
    {
        public string Category { get; set; } = string.Empty;
        public int TotalBalance { get; set; }
    }

    // สำหรับกราฟที่ 2: ยอดเบิกออกแต่ละหมวดหมู่ตามช่วงเวลา
    public class CategoryWithdrawalChartDto
    {
        public string Category { get; set; } = string.Empty;
        public int TotalWithdrawn { get; set; }
    }
}