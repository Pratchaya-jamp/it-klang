using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using StockApi.Config;
using StockApi.Dtos;
using StockApi.Entities;
using StockApi.Utilities;

namespace StockApi.Services
{
    public interface IAuthService
    {
        Task RegisterAsync(RegisterRequest request);
        Task<LoginResponse> LoginAsync(LoginRequest request);
        Task ChangePasswordAsync(ChangePasswordRequest request);
        Task<UserProfileDto> GetUserProfileAsync(string staffId);
        Task AdminResetPasswordAsync(string targetStaffId, string newPassword);
        Task UpdateUserProfileAsync(string staffId, UserUpdateProfileRequest request);
        Task AdminUpdateUserAsync(string targetStaffId, AdminUpdateUserRequest request);
    }

    public class AuthService : IAuthService
    {
        private readonly AppDbContext _context;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _configuration;

        public AuthService(AppDbContext context, IEmailService emailService, IConfiguration configuration)
        {
            _context = context;
            _emailService = emailService;
            _configuration = configuration;
        }

        public async Task RegisterAsync(RegisterRequest request)
        {
            // 1. เช็คซ้ำ
            if (await _context.Users.AnyAsync(u => u.StaffId == request.StaffId))
                throw new Exception("Staff ID นี้มีอยู่ในระบบแล้ว");

            // 2. Auto-Generate Password (สุ่ม 8 ตัวอักษร)
            string tempPassword = Guid.NewGuid().ToString().Substring(0, 8);

            // 3. Hash Argon2
            string passwordHash = PasswordHasher.HashPassword(tempPassword);

            // 4. บันทึก
            var user = new User
            {
                StaffId = request.StaffId,
                Name = request.Name,
                Email = request.Email,
                Role = request.Role,
                PasswordHash = passwordHash,
                IsForceChangePassword = true, // บังคับเปลี่ยนรหัสครั้งแรกเสมอ!
                CreatedAt = DateTime.Now
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // 5. ส่งเมล
            await _emailService.SendPasswordEmailAsync(request.Email, request.Name, request.StaffId, tempPassword);
        }

        public async Task<LoginResponse> LoginAsync(LoginRequest request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.StaffId == request.StaffId);
            if (user == null) throw new Exception("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");

            // 1. ตรวจรหัสผ่าน (Argon2)
            if (!PasswordHasher.VerifyPassword(request.Password, user.PasswordHash))
                throw new Exception("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");

            // 2. ถ้าเป็น First Login -> ไม่ต้องเจน Token, ส่ง flag ไปบอกให้เปลี่ยนรหัส
            if (user.IsForceChangePassword)
            {
                return new LoginResponse { Token = "", IsForceChangePassword = true };
            }

            // 3. ถ้าปกติ -> เจน Token
            string token = CreateToken(user);
            return new LoginResponse { Token = token, IsForceChangePassword = false };
        }

        public async Task ChangePasswordAsync(ChangePasswordRequest request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.StaffId == request.StaffId);
            if (user == null) throw new Exception("ไม่พบผู้ใช้งาน");

            // 1. เช็ครหัสเก่าก่อนเปลี่ยน
            if (!PasswordHasher.VerifyPassword(request.OldPassword, user.PasswordHash))
                throw new Exception("รหัสผ่านเดิมไม่ถูกต้อง");

            // 2. เปลี่ยนรหัสใหม่
            user.PasswordHash = PasswordHasher.HashPassword(request.NewPassword);
            user.IsForceChangePassword = false; // ปลดล็อคแล้ว

            await _context.SaveChangesAsync();
        }

        private string CreateToken(User user)
        {
            // 1. กำหนด Claims แบบชื่อสั้น (Manual String)
            var claims = new List<Claim>
            {
                new Claim("id", user.StaffId),
                new Claim("name", user.Name),
                new Claim("role", user.Role),
            };

            var keyString = _configuration.GetSection("Jwt:Key").Value!;
            var issuer = _configuration.GetSection("Jwt:Issuer").Value!; // <--- ดึง Issuer จาก Config

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(keyString));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha512Signature);

            var token = new JwtSecurityToken(
                issuer: issuer,      // <--- ใส่ iss ตรงนี้
                audience: null,      // ไม่ได้ใช้ audience ก็ใส่ null
                claims: claims,
                expires: DateTime.Now.AddHours(1),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public async Task<UserProfileDto> GetUserProfileAsync(string staffId)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.StaffId == staffId);
            if (user == null) throw new Exception("ไม่พบข้อมูลผู้ใช้งาน");

            // Map Entity -> DTO (ส่งเฉพาะข้อมูลที่เปิดเผยได้)
            return new UserProfileDto
            {
                StaffId = user.StaffId,
                Name = user.Name,
                Email = user.Email,
                Role = user.Role,
                IsForceChangePassword = user.IsForceChangePassword,
                CreatedAt = user.CreatedAt
            };
        }

        public async Task AdminResetPasswordAsync(string targetStaffId, string newPassword)
        {
            // 1. ค้นหา User คนนั้น (คนที่ account มีปัญหา)
            var user = await _context.Users.FirstOrDefaultAsync(u => u.StaffId == targetStaffId);
            if (user == null) throw new Exception("ไม่พบผู้ใช้งานรายนี้ในระบบ");

            // 2. ไม่ต้องเช็ค OldPassword! (เพราะเราเป็น SuperAdmin)
            // ยัดรหัสใหม่ใส่เข้าไปเลย
            user.PasswordHash = PasswordHasher.HashPassword(newPassword);

            // 3. บังคับให้เขาเปลี่ยนรหัสใหม่เองอีกรอบตอน Login ครั้งหน้า (เพื่อความปลอดภัย)
            user.IsForceChangePassword = true;

            await _context.SaveChangesAsync();
        }

        // --- 1. User แก้ไขตัวเอง ---
        public async Task UpdateUserProfileAsync(string staffId, UserUpdateProfileRequest request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.StaffId == staffId);
            if (user == null) throw new Exception("ไม่พบข้อมูลผู้ใช้งาน");

            // อัปเดตเฉพาะข้อมูลทั่วไป
            user.Name = request.Name;
            user.Email = request.Email;

            // Log หรือทำอย่างอื่นเพิ่มเติมได้ที่นี่

            await _context.SaveChangesAsync();
        }

        // --- 2. Admin แก้ไขคนอื่น ---
        public async Task AdminUpdateUserAsync(string targetStaffId, AdminUpdateUserRequest request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.StaffId == targetStaffId);
            if (user == null) throw new Exception($"ไม่พบผู้ใช้งาน ID: {targetStaffId}");

            // Admin แก้ได้ทุกอย่าง
            user.Name = request.Name;
            user.Email = request.Email;

            // เช็ค Role ว่าถูกต้องไหมก่อนบันทึก
            var validRoles = new[] { "User", "Admin", "SuperAdmin" };
            if (!validRoles.Contains(request.Role))
            {
                throw new Exception("Role ไม่ถูกต้อง (ต้องเป็น User, Admin หรือ SuperAdmin)");
            }
            user.Role = request.Role;

            // (Optional) ถ้ามี field IsActive
            // user.IsActive = request.IsActive;

            await _context.SaveChangesAsync();
        }
    }
}