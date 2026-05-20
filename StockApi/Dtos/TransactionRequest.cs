using System.ComponentModel.DataAnnotations;

namespace StockApi.Dtos
{
    public class PurchaseRequestDto
    {
        [Required] public string ItemCode { get; set; } = string.Empty;
        [Required] public string JobNo { get; set; } = string.Empty;
        [Required][Range(1, int.MaxValue)] public int Quantity { get; set; }
        [Required(ErrorMessage = "กรุณาระบุเหตุผลในการขอซื้อ")] public string Note { get; set; } = string.Empty;
    }

    public class ReceiveRequest
    {
        [Required]
        public string ItemCode { get; set; } = string.Empty;

        // 🔥 คืนชีพฟิลด์นี้ เพื่อระบุว่ารับของเข้ามาเคลียร์ให้ Job ไหน
        [Required(ErrorMessage = "กรุณาระบุรหัสอ้างอิง Job (Job No)")]
        public string JobNo { get; set; } = string.Empty;

        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "จำนวนต้องมากกว่า 0")]
        public int Quantity { get; set; }

        public string Note { get; set; } = string.Empty;
    }

    public class WithdrawRequest
    {
        [Required] public string ItemCode { get; set; } = string.Empty;
        [Required] public string JobNo { get; set; } = string.Empty;
        [Required][Range(1, int.MaxValue)] public int Quantity { get; set; }
        public string Note { get; set; } = string.Empty;
    }

    public class ApproveWithdrawRequest
    {
        [Required] public string TransactionNo { get; set; } = string.Empty; // ใช้เลขนี้ในการอ้างอิงบิลที่รออนุมัติ
        public string Note { get; set; } = string.Empty; // หมายเหตุตอนจ่ายของ (ถ้ามี)
    }

    public class WriteOffRequest
    {
        [Required] public string ItemCode { get; set; } = string.Empty;
        [Required] public string JobNo { get; set; } = string.Empty;
        [Required][Range(1, int.MaxValue)] public int Quantity { get; set; }
        [Required] public string Note { get; set; } = string.Empty;
    }


    public class WriteOffSummaryDto
    {
        public string TransactionNo { get; set; } = string.Empty;
        public string ItemCode { get; set; } = string.Empty;
        public string ItemName { get; set; } = string.Empty;

        // 🔥 เติม Category กลับเข้ามา
        public string Category { get; set; } = string.Empty;

        public string JobNo { get; set; } = string.Empty;
        public int TotalWriteOff { get; set; }
        public string LastWriteOffDate { get; set; } = string.Empty;

        public string RecordedBy { get; set; } = string.Empty;

        // 🔥 เติม ActionBy เพื่อเก็บชื่อคนตัดรายการ
        public string ActionBy { get; set; } = string.Empty;
    }
}