using System.ComponentModel.DataAnnotations;

namespace StockApi.Dtos
{
    public class CreateSupportRequest
    {
        [Required(ErrorMessage = "กรุณาระบุรายละเอียดปัญหา")]
        public string Note { get; set; } = string.Empty;
    }

    public class SupportTicketResponse
    {
        public int Id { get; set; }
        public string StaffId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Note { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string CreatedAt { get; set; } = string.Empty;
    }
}