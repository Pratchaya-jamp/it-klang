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
        Task AdminResetPasswordWithOtpAsync(string adminStaffId, string targetStaffId, string otpCode);

        Task UpdateUserProfileAsync(string staffId, UserUpdateProfileRequest request);
        Task AdminUpdateUserAsync(string targetStaffId, AdminUpdateUserRequest request);

        Task ForgotPasswordAsync(string email);
        Task ResetPasswordWithTokenAsync(ResetPasswordRequest request);
        Task<bool> ValidateResetTokenAsync(string token);
        Task<List<UserListDto>> GetAllUsersAsync();
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

            // 1. เช็คว่ารหัสเก่าที่กรอกมา (OldPassword) ตรงกับใน DB ไหม
            if (!PasswordHasher.VerifyPassword(request.OldPassword, user.PasswordHash))
                throw new Exception("รหัสผ่านเดิมไม่ถูกต้อง");

            // 🔥 2. เช็คว่ารหัสใหม่ (NewPassword) ดันไปซ้ำกับรหัสปัจจุบันใน DB หรือเปล่า
            // เราต้องใช้ PasswordHasher.VerifyPassword เท่านั้นในการเช็ค
            bool isSameAsOld = PasswordHasher.VerifyPassword(request.NewPassword, user.PasswordHash);

            if (isSameAsOld)
            {
                // ถ้ารหัสใหม่กับรหัสใน DB ดันแกะออกมาแล้วตรงกัน ให้ดีดออกทันที
                throw new Exception("คุณไม่สามารถใช้รหัสผ่านเดิมได้ กรุณาตั้งรหัสผ่านใหม่ที่ต่างจากเดิม");
            }

            // 3. ถ้าผ่านด่านมาได้ค่อยทำการ Hash รหัสใหม่แล้วบันทึก
            user.PasswordHash = PasswordHasher.HashPassword(request.NewPassword);
            user.IsForceChangePassword = false;

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
                expires: DateTime.UtcNow.AddHours(1),
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

        public async Task AdminResetPasswordWithOtpAsync(string adminStaffId, string targetStaffId, string otpCode)
        {
            // 1. ตรวจสอบ OTP (เหมือนเดิม)
            if (!_cache.TryGetValue($"OTP_{adminStaffId}", out string? savedOtp) || savedOtp != otpCode)
            {
                throw new Exception("รหัส OTP ไม่ถูกต้องหรือหมดอายุ");
            }

            _cache.Remove($"OTP_{adminStaffId}");

            // 2. หา User ที่ต้องการรีเซ็ต
            var user = await _context.Users.FirstOrDefaultAsync(u => u.StaffId == targetStaffId);
            if (user == null) throw new Exception("ไม่พบผู้ใช้งานที่ต้องการรีเซ็ต");

            // 🔥 3. ระบบเจนรหัสผ่านให้เอง (สุ่ม 8 ตัวอักษร)
            // ใช้ตัวเลขและตัวอักษรผสมกันเพื่อความปลอดภัย
            string autoGeneratedPassword = Guid.NewGuid().ToString("N").Substring(0, 8);

            // 4. บันทึกลง DB
            user.PasswordHash = PasswordHasher.HashPassword(autoGeneratedPassword);
            user.IsForceChangePassword = true; // บังคับเปลี่ยนรหัสเมื่อเข้าสู่ระบบครั้งแรก

            await _context.SaveChangesAsync();

            // 📩 5. ส่งอีเมลแจ้งรหัสผ่านใหม่ให้ User
            if (!string.IsNullOrEmpty(user.Email))
            {
                string subject = "แจ้งเตือน: บัญชีของคุณได้รับการรีเซ็ตรหัสผ่านใหม่";
                string body = $@"
            <div style='font-family: sans-serif; border: 1px solid #ddd; padding: 20px;'>
                <h2 style='color: #2c3e50;'>สวัสดีคุณ {user.Name}</h2>
                <p>ผู้ดูแลระบบได้ทำการรีเซ็ตรหัสผ่านเข้าสู่ระบบของคุณเรียบร้อยแล้ว</p>
                <div style='background: #f4f4f4; padding: 15px; border-radius: 5px; font-size: 18px;'>
                    รหัสผ่านใหม่ของคุณคือ: <b style='color: #e74c3c;'>{autoGeneratedPassword}</b>
                </div>
                <p style='color: #7f8c8d; font-size: 12px; margin-top: 20px;'>
                    *เพื่อความปลอดภัย ระบบจะบังคับให้คุณเปลี่ยนรหัสผ่านทันทีที่เข้าสู่ระบบครั้งแรก
                </p>
            </div>";

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
            // 1. ตรวจสอบเบื้องต้น: ถ้าส่งมาเป็นค่าว่าง ให้ดีดออกทันที
            if (string.IsNullOrWhiteSpace(request.Token))
            {
                throw new Exception("Invalid Token: Token cannot be empty");
            }

            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(Env.GetString("JWT_KEY")!);

            try
            {
                // 2. ตั้งค่าการตรวจแบบเข้มข้น (Strict Mode)
                var validationParameters = new TokenValidationParameters
                {
                    // ตรวจสอบลายเซ็น (Signature) ว่ามาจาก Key ของเราจริงๆ
                    // *ถ้า Token ผิดแม้แต่ตัวเดียว Signature จะพังทันที*
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),

                    // ตรวจสอบคนออก (Issuer) ว่าต้องเป็นระบบของเรา
                    ValidateIssuer = true,
                    ValidIssuer = Env.GetString("JWT_ISSUER"),

                    // ไม่ต้องตรวจคนรับ (Audience) เพราะเราไม่ได้ระบุตอนสร้าง
                    ValidateAudience = false,

                    // ตรวจสอบวันหมดอายุแบบเคร่งครัด
                    ValidateLifetime = true,

                    // *** สำคัญมาก: ปรับ ClockSkew เป็น 0 ***
                    // (ปกติ .NET จะแถมเวลาให้ 5 นาทีกันนาฬิกาไม่ตรง แต่เราไม่เอา! หมดคือหมด!)
                    ClockSkew = TimeSpan.Zero
                };

                // 3. เริ่มการตรวจสอบ (Validate)
                // บรรทัดนี้คือ "ด่านตรวจคนเข้าเมือง" 
                // ถ้า Token ขาด/เกิน/ผิด/หมดอายุ จะเกิด Exception ทันที
                tokenHandler.ValidateToken(request.Token, validationParameters, out SecurityToken validatedToken);

                // 4. แกะข้อมูลข้างใน (Claims)
                var jwtToken = (JwtSecurityToken)validatedToken;

                // ดึง Email
                var emailClaim = jwtToken.Claims.FirstOrDefault(x => x.Type == "email");
                if (emailClaim == null) throw new SecurityTokenException("Token does not contain email");

                // ดึง Purpose (กันคนเอา Login Token มาเนียน Reset Pass)
                var purposeClaim = jwtToken.Claims.FirstOrDefault(x => x.Type == "purpose");
                if (purposeClaim == null || purposeClaim.Value != "password_reset")
                {
                    throw new SecurityTokenException("Invalid token purpose");
                }

                var email = emailClaim.Value;

                // 5. หา User และเปลี่ยนรหัส
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
                if (user == null) throw new Exception("User not found");

                // *เช็คเพิ่มเติม: ห้ามตั้งรหัสซ้ำกับรหัสปัจจุบัน (Optional)*
                if (PasswordHasher.VerifyPassword(request.NewPassword, user.PasswordHash))
                {
                    throw new Exception("New password cannot be the same as the old password");
                }

                user.PasswordHash = PasswordHasher.HashPassword(request.NewPassword);
                user.IsForceChangePassword = false;

                await _context.SaveChangesAsync();
            }
            catch (SecurityTokenException)
            {
                // จับ Error เฉพาะทางของ Token (เช่น Signature ผิด, หมดอายุ, รูปแบบผิด)
                throw new Exception("Link หมดอายุหรือ Token ไม่ถูกต้อง (กรุณาขอรหัสผ่านใหม่)");
            }
            catch (ArgumentException)
            {
                // จับ Error กรณี Format ของ Token มั่วมาเลย (ไม่ใช่ JWT)
                throw new Exception("รูปแบบ Token ไม่ถูกต้อง");
            }
            catch (Exception ex)
            {
                // Error อื่นๆ (เช่น หา User ไม่เจอ)
                throw new Exception(ex.Message);
            }
        }

        public async Task<bool> ValidateResetTokenAsync(string token)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(Env.GetString("JWT_KEY")!);

            try
            {
                // ตั้งค่าการตรวจสอบแบบเข้มข้นที่สุด (Zero Tolerance)
                tokenHandler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = true,
                    ValidIssuer = Env.GetString("JWT_ISSUER"),
                    ValidateAudience = false,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero // หมดเวลาปุ๊บ ตัดปั๊บ (ไม่มีแถม 5 นาที)
                }, out SecurityToken validatedToken);

                var jwtToken = (JwtSecurityToken)validatedToken;

                // เช็ค Purpose: ต้องเป็น "password_reset" เท่านั้น (กันคนมั่วเอา Login Token มาใช้)
                var purposeClaim = jwtToken.Claims.FirstOrDefault(x => x.Type == "purpose");
                if (purposeClaim == null || purposeClaim.Value != "password_reset")
                {
                    return false; // Token ถูกแต่ผิดวัตถุประสงค์
                }

                // เช็คว่า User เจ้าของ Token ยังมีตัวตนอยู่ไหม
                var email = jwtToken.Claims.First(x => x.Type == "email").Value;
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
                if (user == null)
                {
                    return false; // Token ถูกแต่ User หายไปแล้ว
                }

                return true; // ผ่านทุกด่าน 100%
            }
            catch
            {
                return false; // ผิดพลาดแม้แต่จุดเดียว (Signature ผิด, หมดอายุ, Format ผิด) คืนค่า false ทันที
            }
        }

        public async Task<List<UserListDto>> GetAllUsersAsync()
        {
            // ดึง User ทั้งหมดและเรียงตามวันที่สมัครล่าสุด
            return await _context.Users
                .OrderByDescending(u => u.CreatedAt)
                .Select(u => new UserListDto
                {
                    StaffId = u.StaffId,
                    Name = u.Name,
                    Email = u.Email,
                    Role = u.Role,
                    IsForceChangePassword = u.IsForceChangePassword,
                    CreatedAt = u.CreatedAt
                })
                .ToListAsync();
        }
    }
}