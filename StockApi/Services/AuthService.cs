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
            await _emailService.SendPasswordEmailAsync(request.Email, request.StaffId, tempPassword);
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
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.StaffId),
                new Claim(ClaimTypes.Name, user.Name),
                new Claim(ClaimTypes.Role, user.Role)
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration.GetSection("Jwt:Key").Value!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha512Signature);

            var token = new JwtSecurityToken(
                claims: claims,
                expires: DateTime.Now.AddHours(1), // หมดอายุ 1 ชม.
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}