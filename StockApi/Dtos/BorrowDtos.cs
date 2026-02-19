namespace StockApi.Dtos
{
    public class BorrowRequestDto
    {
        public string ItemCode { get; set; } = string.Empty;
        public int Quantity { get; set; }

        // ✅ เพิ่ม: รับ Job ID จาก User
        public string? JobId { get; set; }

        // ✅ เพิ่ม: รับเวลาที่จะคืน (DueDate)
        public string? DueDate { get; set; }

        public string? Note { get; set; }
    }

    public class BorrowResponseDto
    {
        public int Id { get; set; }
        public string TransactionId { get; set; } = string.Empty;
        public string ItemCode { get; set; } = string.Empty;
        public string ItemName { get; set; } = string.Empty; // ✅ ส่งชื่อคืนไปด้วย
        public int Quantity { get; set; }
        public string JobId { get; set; } = string.Empty; // ✅ ส่ง JobId คืน
        public string RecorderName { get; set; } = string.Empty; // ✅ ส่งชื่อคนทำคืน
        public string Status { get; set; } = string.Empty;
        public DateTime BorrowDate { get; set; }
        public DateTime? DueDate { get; set; }
    }
}