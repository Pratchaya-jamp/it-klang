namespace StockApi.Dtos
{
    public class PendingWithdrawalDto
    {
        public string TransactionNo { get; set; } = string.Empty; // เอาเลข Transaction กลับมาโชว์เพื่อให้กด Approve ได้
        public string ItemCode { get; set; } = string.Empty;
        public string ItemName { get; set; } = string.Empty;
        public string JobNo { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty; // บอกว่าเป็น "รออนุมัติ (PENDING_OUT)" หรือ "รอสั่งซื้อ (PR)"
        public int PendingAmount { get; set; }
        public string LastUpdated { get; set; } = string.Empty;
        public string RecordedBy { get; set; } = string.Empty;
    }
}