namespace StockApi.Dtos
{
	public class PendingWithdrawalDto
	{
		public string ItemCode { get; set; } = string.Empty;
		public string ItemName { get; set; } = string.Empty;
        public string JobNo { get; set; } = string.Empty;
        public int PendingAmount { get; set; } // จำนวนที่ต้องรับคืน (TempWithdrawn)
		public string LastUpdated { get; set; } = string.Empty;
	}
}