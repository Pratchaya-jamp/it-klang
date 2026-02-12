namespace StockApi.Dtos
{
    public class UserProfileDto
    {
        public string StaffId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public bool IsForceChangePassword { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}