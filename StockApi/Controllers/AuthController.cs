using Microsoft.AspNetCore.Mvc;
using StockApi.Dtos;
using StockApi.Services;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

namespace StockApi.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        // POST: api/auth/register
        [AllowAnonymous]
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            try
            {
                await _authService.RegisterAsync(request);

                // 201 Created: เพราะมีการสร้าง User ใหม่ในระบบ
                return StatusCode(201, new { message = "ลงทะเบียนสำเร็จ! รหัสผ่านถูกส่งไปยังอีเมลแล้ว (ดูใน Console)" });
            }
            catch (Exception ex)
            {
                // 400 Bad Request (เช่น StaffId ซ้ำ, ข้อมูลไม่ครบ)
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/auth/login
        [AllowAnonymous]
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            try
            {
                var response = await _authService.LoginAsync(request);

                if (response.IsForceChangePassword)
                {
                    // 200 OK: ส่งผลลัพธ์ปกติ แต่แจ้ง Frontend ว่าต้องเปลี่ยนรหัส
                    return StatusCode(201,new
                    {
                        message = "กรุณาเปลี่ยนรหัสผ่านก่อนเข้าใช้งาน",
                        requireChangePassword = true
                    });
                }

                var cookieOptions = new CookieOptions
                {
                    HttpOnly = true,        // JS เข้าถึงไม่ได้ (กัน XSS)
                    Secure = true,          // ส่งผ่าน HTTPS เท่านั้น (Localhost ก็ได้ถ้า Dev cert ผ่าน)
                    SameSite = SameSiteMode.Strict, // ป้องกัน CSRF
                    Expires = DateTime.Now.AddHours(1) // อายุเท่ากับ Token
                };

                Response.Cookies.Append("accessToken", response.Token, cookieOptions);

                // 200 OK: Login สำเร็จ ได้ Token
                return StatusCode(201, new { message = "เข้าสู่ระบบสำเร็จ" });
            }
            catch (Exception ex)
            {
                // 400 Bad Request (หรือ 401 Unauthorized ก็ได้ แต่ใช้ 400 เพื่อความง่ายตาม Pattern เดิม)
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/auth/change-password
        [AllowAnonymous]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            try
            {
                await _authService.ChangePasswordAsync(request);

                // 200 OK: การแก้ไขข้อมูลสำเร็จ
                return StatusCode(201, new { message = "เปลี่ยนรหัสผ่านสำเร็จ กรุณา Login ใหม่อีกครั้ง" });
            }
            catch (Exception ex)
            {
                // 400 Bad Request (เช่น รหัสเดิมผิด)
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("logout")]
        public IActionResult Logout()
        {
            Response.Cookies.Delete("accessToken");
            return Ok(new { message = "ออกจากระบบสำเร็จ" });
        }

        // GET: api/auth/me
        // ดึงข้อมูลตัวเอง (ต้องแนบ Token)
        [Authorize] // <--- บังคับ Login
        [HttpGet("me")]
        public async Task<IActionResult> GetMe()
        {
            try
            {
                // 1. แกะ StaffId ออกมาจาก Token (ที่เรายัดไว้ตอน Login)
                // ClaimTypes.NameIdentifier คือมาตรฐานที่เก็บ ID
                var staffId = User.FindFirst("id")?.Value;

                if (string.IsNullOrEmpty(staffId))
                {
                    return Unauthorized(new { message = "Token ไม่สมบูรณ์ หรือหา User ID ไม่เจอ" });
                }

                // 2. เรียก Service ไปดึงข้อมูล
                var userProfile = await _authService.GetUserProfileAsync(staffId);

                // 200 OK
                return Ok(new { data = userProfile });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [Authorize(Policy = "SuperAdminOnly")]
        [HttpPost("admin/request-otp")]
        public async Task<IActionResult> RequestOtp()
        {
            try
            {
                var adminId = User.FindFirst("id")?.Value;
                await _authService.RequestAdminOtpAsync(adminId!);
                return Ok(new { message = "ส่งรหัส OTP ไปยังอีเมลของคุณแล้ว" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [Authorize(Policy = "SuperAdminOnly")]
        [HttpPost("admin/reset-password")]
        public async Task<IActionResult> AdminResetPassword([FromBody] AdminResetPasswordRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.OtpCode))
                    return BadRequest(new { message = "กรุณากรอกรหัส OTP" });

                var adminId = User.FindFirst("id")?.Value;
                await _authService.AdminResetPasswordWithOtpAsync(adminId!, request.TargetStaffId, request.NewPassword, request.OtpCode);
                return StatusCode(201, new { message = $"รีเซ็ตรหัสผ่านของ {request.TargetStaffId} สำเร็จ" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        //[Authorize] // แค่ Login ก็เข้าได้
        //[HttpGet("debug")]
        //public IActionResult DebugClaims()
        //{
        //    return Ok(new
        //    {
        //        IsAuthenticated = User.Identity?.IsAuthenticated,
        //        Name = User.Identity?.Name,
        //        // ดูว่า Server เห็น Claim อะไรบ้าง
        //        Claims = User.Claims.Select(c => new { c.Type, c.Value }).ToList(),
        //        // เช็คดูซิว่า Server ยอมรับว่าเป็น SuperAdmin ไหม
        //        IsInRole = User.IsInRole("SuperAdmin")
        //    });
        //}

        [Authorize] // <--- ใครก็ได้ที่ Login แล้ว
        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UserUpdateProfileRequest request)
        {
            try
            {
                // 1. ดึง ID จาก Token ของตัวเอง (ปลอดภัยที่สุด ห้ามรับ ID จาก Body)
                // ต้องใช้ claim "id" ตามที่เราคุยกันล่าสุด
                var staffId = User.FindFirst("id")?.Value;

                if (string.IsNullOrEmpty(staffId)) return Unauthorized();

                await _authService.UpdateUserProfileAsync(staffId, request);

                return Ok(new { message = "อัปเดตข้อมูลส่วนตัวสำเร็จ" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // PUT: api/auth/admin/users/{id}
        // SuperAdmin แก้ไขข้อมูลคนอื่น
        [Authorize(Policy = "SuperAdminOnly")] // <--- ใช้ Policy ที่เราเพิ่งแก้ผ่าน
        [HttpPut("admin/users/{staffId}")]
        public async Task<IActionResult> AdminUpdateUser(string staffId, [FromBody] AdminUpdateUserRequest request)
        {
            try
            {
                // ส่ง ID จาก URL และข้อมูลจาก Body ไปให้ Service
                await _authService.AdminUpdateUserAsync(staffId, request);
                return Ok(new { message = $"อัปเดตข้อมูลผู้ใช้งาน {staffId} เรียบร้อยแล้ว" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [AllowAnonymous]
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            try
            {
                await _authService.ForgotPasswordAsync(request.Email);
                return Ok(new { message = "ระบบได้ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลของคุณแล้ว" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [AllowAnonymous] // เปิดให้ยิงเข้ามาได้เลยไม่ต้อง Login
        [HttpGet("validate-reset-token")]
        public async Task<IActionResult> ValidateResetToken([FromQuery] string token)
        {
            if (string.IsNullOrWhiteSpace(token))
            {
                return BadRequest(new { message = "Token is required" });
            }

            var isValid = await _authService.ValidateResetTokenAsync(token);

            if (!isValid)
            {
                // ถ้า Token ไม่ผ่าน (หมดอายุ, ปลอมแปลง, ผิดวัตถุประสงค์)
                return BadRequest(new { message = "Invalid or expired token" });
            }

            // ถ้าผ่าน ส่ง 200 OK กลับไป Frontend จะได้โชว์ฟอร์มกรอกรหัสผ่าน
            return Ok(new { message = "Token is valid" });
        }

        // POST: api/auth/reset-password-token
        [AllowAnonymous]
        [HttpPost("reset-password-token")]
        public async Task<IActionResult> ResetPasswordToken([FromBody] ResetPasswordRequest request)
        {
            try
            {
                await _authService.ResetPasswordWithTokenAsync(request);
                return Ok(new { message = "เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [Authorize(Policy = "SuperAdminOnly")]
        [HttpGet("admin/users")]
        public async Task<IActionResult> GetAllUsers()
        {
            try
            {
                var users = await _authService.GetAllUsersAsync();
                return Ok(users);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}