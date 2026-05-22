using System.ComponentModel.DataAnnotations;

namespace StockApi.Dtos
{
    public class PurchaseRequestDto
    {
        // 🔥 เติมเครื่องหมาย ? เข้าไป เพื่อบอก .NET ว่าอนุญาตให้เป็น null/ค่าว่างได้
        public string? ItemCode { get; set; }

        [Required(ErrorMessage = "กรุณาระบุรหัสอ้างอิง Job (Job No)")]
        public string JobNo { get; set; } = string.Empty;

        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "จำนวนต้องมากกว่า 0")]
        public int Quantity { get; set; }

        public string? Note { get; set; } // Note ก็ควรเป็นแบบ Nullable ได้เช่นกัน

        public bool IsNewItem { get; set; } = false;
        public bool AutoGenerateCode { get; set; } = false;

        // 🔥 กลุ่มนี้ต้องเติม ? ทั้งหมด เพราะถ้าเป็นของเก่า (isNewItem = false) ยูสเซอร์จะไม่ส่งข้อมูลพวกนี้มา
        public string? ItemName { get; set; }
        public string? Category { get; set; }
        public string? Unit { get; set; }
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

    // ประวัติการขอซื้อ
    public class PurchaseHistoryDto
    {
        public string TransactionNo { get; set; } = string.Empty;
        public string ItemCode { get; set; } = string.Empty;
        public string ItemName { get; set; } = string.Empty;
        public string JobNo { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public string Note { get; set; } = string.Empty;
        public string CreatedBy { get; set; } = string.Empty;
        public string ReceivedBy { get; set; } = string.Empty;
        public string CanceledBy { get; set; } = string.Empty; // 🔥 เพิ่มฟิลด์ผู้ยกเลิก
        public string CreatedAt { get; set; } = string.Empty;
    }

    // ประวัติการเบิกออก
    public class WithdrawHistoryDto
    {
        public string TransactionNo { get; set; } = string.Empty;
        public string ItemCode { get; set; } = string.Empty;
        public string ItemName { get; set; } = string.Empty;
        public string JobNo { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public string Status { get; set; } = string.Empty;
        public string Note { get; set; } = string.Empty;
        public string CreatedBy { get; set; } = string.Empty;
        public string ApprovedBy { get; set; } = string.Empty;
        public string CanceledBy { get; set; } = string.Empty; // 🔥 เพิ่มฟิลด์ผู้ยกเลิก
        public string CreatedAt { get; set; } = string.Empty;
    }

    public class CancelRequestDto
    {
        [Required(ErrorMessage = "กรุณาระบุหมายเลข Transaction (TransactionNo)")]
        public string TransactionNo { get; set; } = string.Empty;

        [Required(ErrorMessage = "กรุณาระบุเหตุผลในการยกเลิกคำขอ")]
        public string Note { get; set; } = string.Empty;
    }
}