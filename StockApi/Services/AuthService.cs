using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using StockApi.Config;
using StockApi.Dtos;
using StockApi.Entities;
using StockApi.Utilities;
using DotNetEnv;
using Microsoft.Extensions.Caching.Memory;

namespace StockApi.Services
{
    public interface IAuthService
    {
        Task RegisterAsync(RegisterRequest request);
        Task<LoginResponse> LoginAsync(LoginRequest request);
        Task ChangePasswordAsync(ChangePasswordRequest request);
        Task<UserProfileDto> GetUserProfileAsync(string staffId);

        // --- แก้ไข 2 บรรทัดนี้ ---
        Task RequestAdminOtpAsync(string adminStaffId); // เพิ่มสำหรับขอ OTP
        Task AdminResetPasswordWithOtpAsync(string adminStaffId, string targetStaffId, string newPassword, string otpCode);

        Task UpdateUserProfileAsync(string staffId, UserUpdateProfileRequest request);
        Task AdminUpdateUserAsync(string targetStaffId, AdminUpdateUserRequest request);

        Task ForgotPasswordAsync(string email);
        Task ResetPasswordWithTokenAsync(ResetPasswordRequest request);
    }

    public class AuthService : IAuthService
    {
        private readonly AppDbContext _context;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _configuration;
        private readonly IMemoryCache _cache;

        public AuthService(AppDbContext context, IEmailService emailService, IConfiguration configuration, IMemoryCache cache)
        {
            _context = context;
            _emailService = emailService;
            _configuration = configuration;
            _cache = cache;
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
            // 1. ดึง Key จาก .env เป็น string ก่อน
            string jwtKeyString = Env.GetString("JWT_KEY")!;

            // 2. แปลง string เป็น SymmetricSecurityKey
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKeyString));

            // 3. สร้าง Credentials (ตรงนี้แหละที่มักจะใส่ผิด)
            // ตัวแปร key ต้องใส่ในตำแหน่งแรกของ SigningCredentials
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new Claim("id", user.StaffId),
                new Claim("name", user.Name),
                new Claim("role", user.Role)
            };

            var token = new JwtSecurityToken(
                issuer: Env.GetString("JWT_ISSUER"), // ดึงจาก .env ตรงๆ
                audience: null,
                claims: claims,
                expires: DateTime.Now.AddHours(1),
                signingCredentials: creds // ใส่ตัวแปร creds ที่สร้างไว้ข้างบน
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

        public async Task RequestAdminOtpAsync(string adminStaffId)
        {
            var admin = await _context.Users.FirstOrDefaultAsync(u => u.StaffId == adminStaffId);
            if (admin == null) throw new Exception("ไม่พบข้อมูลผู้ดูแลระบบ");

            // สร้างเลข 6 หลัก
            var otpCode = new Random().Next(100000, 999999).ToString();

            // เก็บใน Cache 5 นาที โดยผูกกับ StaffId ของ Admin
            _cache.Set($"OTP_{adminStaffId}", otpCode, TimeSpan.FromMinutes(5));

            // ส่งอีเมลหา Admin
            await _emailService.SendEmailAsync(
                admin.Email,
                "รหัส OTP สำหรับยืนยันการรีเซ็ตรหัสผ่าน",
                $"<h3>รหัสยืนยันของคุณคือ: <b style='color:blue;'>{otpCode}</b></h3><p>รหัสนี้มีอายุ 5 นาที</p>"
            );
        }

        public async Task AdminResetPasswordWithOtpAsync(string adminStaffId, string targetStaffId, string newPassword, string otpCode)
        {
            // เช็ค OTP ใน Cache
            if (!_cache.TryGetValue($"OTP_{adminStaffId}", out string? savedOtp) || savedOtp != otpCode)
            {
                throw new Exception("รหัส OTP ไม่ถูกต้องหรือหมดอายุ");
            }

            // ถ้าผ่าน ให้ลบ OTP ทิ้งทันที (ใช้ได้ครั้งเดียว)
            _cache.Remove($"OTP_{adminStaffId}");

            // ทำการเปลี่ยนรหัสให้ User ตามปกติ
            var user = await _context.Users.FirstOrDefaultAsync(u => u.StaffId == targetStaffId);
            if (user == null) throw new Exception("ไม่พบผู้ใช้งานที่ต้องการรีเซ็ต");

            user.PasswordHash = PasswordHasher.HashPassword(newPassword);
            user.IsForceChangePassword = true;
            await _context.SaveChangesAsync();

            // 4. *** เพิ่มส่วนนี้: ส่งอีเมลแจ้งเจ้าตัว ***
            // เช็คก่อนว่ามีอีเมลไหม (เผื่อ User คนนี้ไม่ได้ลงอีเมลไว้)
            if (!string.IsNullOrEmpty(user.Email))
            {
                string subject = "แจ้งเตือน: รหัสผ่านของคุณถูกรีเซ็ตโดยผู้ดูแลระบบ";
                string body = $@"
                    <h3>เรียนคุณ {user.Name} ({user.StaffId})</h3>
                    <p>ผู้ดูแลระบบได้ทำการรีเซ็ตรหัสผ่านของคุณเรียบร้อยแล้ว</p>
                    <p>รหัสผ่านใหม่ของคุณคือ: <strong>{newPassword}</strong></p>
                    <hr />
                    <p style='color: red;'>*กรุณาเข้าสู่ระบบด้วยรหัสผ่านนี้ และทำการเปลี่ยนรหัสผ่านใหม่ทันทีเพื่อความปลอดภัย</p>
                    <p>ขอบคุณครับ<br/>Stock API System</p>
                ";

                // ส่งแบบ Fire-and-Forget (ไม่ต้องรอผลส่งเสร็จ) หรือจะ await ก็ได้ถ้าอยากชัวร์
                await _emailService.SendEmailAsync(user.Email, subject, body);
            }
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

            // 1. อัปเดตข้อมูลทั่วไป
            user.Name = request.Name;
            user.Email = request.Email;

            // 2. อัปเดต Role (แบบ Custom / กรอกมือ)
            if (!string.IsNullOrWhiteSpace(request.Role))
            {
                // ตัดช่องว่างหน้า-หลังทิ้ง เพื่อความสะอาดของข้อมูล
                string cleanRole = request.Role.Trim();

                // บันทึกลง DB เลย ไม่ต้องเช็ค List อะไรทั้งนั้น
                user.Role = cleanRole;
            }

            await _context.SaveChangesAsync();
        }

        public async Task ForgotPasswordAsync(string email)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null) throw new Exception("ไม่พบอีเมลนี้ในระบบ");

            // 1. สร้าง Reset Token (อายุ 15 นาที) 
            // เราจะใส่ Claim พิเศษเข้าไปเพื่อบอกว่าเป็น token สำหรับ reset เท่านั้น
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(Env.GetString("JWT_KEY")!);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[] {
            new Claim("email", user.Email),
            new Claim("purpose", "password_reset") // กันคนเอา Login Token มาสวมรอย
            }),
                Expires = DateTime.UtcNow.AddMinutes(15),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature),
                Issuer = Env.GetString("JWT_ISSUER")
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            var resetToken = tokenHandler.WriteToken(token);

            var frontendUrl = Env.GetString("FRONTEND_URL");
            frontendUrl = frontendUrl.TrimEnd('/');

            // 2. สร้าง Link
            var resetLink = $"{frontendUrl}/reset-password?token={resetToken}";

            // 3. ส่งอีเมล
            await _emailService.SendEmailAsync(
                user.Email,
                "รีเซ็ตรหัสผ่านระบบ Stock API",
                $"<p>กรุณาคลิกลิงก์เพื่อตั้งรหัสผ่านใหม่ (ลิงก์มีอายุ 15 นาที):</p><a href='{resetLink}'>{resetLink}</a>"
            );
        }

        public async Task ResetPasswordWithTokenAsync(ResetPasswordRequest request)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(Env.GetString("JWT_KEY")!);

            try
            {
                // 1. Validate และแกะ Token
                tokenHandler.ValidateToken(request.Token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = true,
                    ValidIssuer = Env.GetString("JWT_ISSUER"),
                    ValidateAudience = false,
                    ClockSkew = TimeSpan.Zero // หมดเวลาปุ๊บ ตัดปั๊บ
                }, out SecurityToken validatedToken);

                var jwtToken = (JwtSecurityToken)validatedToken;
                var email = jwtToken.Claims.First(x => x.Type == "email").Value;
                var purpose = jwtToken.Claims.First(x => x.Type == "purpose").Value;

                if (purpose != "password_reset") throw new Exception("Invalid token purpose");

                // 2. หา User จาก Email ใน Token
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
                if (user == null) throw new Exception("ไม่พบผู้ใช้งาน");

                // 3. เปลี่ยนรหัสผ่าน
                user.PasswordHash = PasswordHasher.HashPassword(request.NewPassword);
                user.IsForceChangePassword = false;

                await _context.SaveChangesAsync();
            }
            catch (Exception)
            {
                throw new Exception("ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว");
            }
        }
    }
}