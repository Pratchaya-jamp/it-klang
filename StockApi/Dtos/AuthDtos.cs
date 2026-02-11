namespace StockApi.Dtos
{
    public class RegisterRequest
    {
        public string StaffId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = "User";
    }

    public class LoginRequest
    {
        public string StaffId { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class LoginResponse
    {
        public string Token { get; set; } = string.Empty;
        public bool IsForceChangePassword { get; set; } // บอก Frontend ว่าต้องเด้งหน้าเปลี่ยนรหัสไหม
    }

    public class ChangePasswordRequest
    {
        public string StaffId { get; set; } = string.Empty;
        public string OldPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}