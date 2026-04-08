using System.ComponentModel.DataAnnotations;

namespace StockApi.Dtos
{
    public class CreateSupportRequest
    {
        [Required(ErrorMessage = "กรุณาระบุรายละเอียดปัญหา")]
        public string Note { get; set; } = string.Empty;
    }

    // ✅ เพิ่ม DTO สำหรับรับค่าตอนกดตอบกลับ
    public class ReplySupportRequest
    {
        [Required(ErrorMessage = "กรุณาระบุข้อความตอบกลับ")]
        public string ReplyMessage { get; set; } = string.Empty;
    }

    // ✅ อัปเดต Response ให้คืนค่า Reply กลับไปโชว์ที่หน้าเว็บด้วย
    public class SupportTicketResponse
    {
        public string TicketNo { get; set; } = string.Empty;
        public string StaffId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Note { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string CreatedAt { get; set; } = string.Empty;

        // ข้อมูลการตอบกลับ (ถ้ายังไม่ตอบ จะเป็น null)
        public string? ReplyMessage { get; set; }
        public string? RepliedBy { get; set; }
        public string? RepliedAt { get; set; }

        public decimal? Rating { get; set; }
        public string? RatedAt { get; set; }
    }

    public class RateTicketRequest
    {
        [Range(0.5, 5.0, ErrorMessage = "คะแนนต้องอยู่ระหว่าง 0.5 ถึง 5.0")]
        public decimal Rating { get; set; }
    }
}