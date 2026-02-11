using Microsoft.AspNetCore.Mvc;
using StockApi.Dtos;
using StockApi.Services;

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
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            try
            {
                var response = await _authService.LoginAsync(request);

                if (response.IsForceChangePassword)
                {
                    // 200 OK: ส่งผลลัพธ์ปกติ แต่แจ้ง Frontend ว่าต้องเปลี่ยนรหัส
                    return Ok(new
                    {
                        message = "กรุณาเปลี่ยนรหัสผ่านก่อนเข้าใช้งาน",
                        requireChangePassword = true
                    });
                }

                // 200 OK: Login สำเร็จ ได้ Token
                return Ok(response);
            }
            catch (Exception ex)
            {
                // 400 Bad Request (หรือ 401 Unauthorized ก็ได้ แต่ใช้ 400 เพื่อความง่ายตาม Pattern เดิม)
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/auth/change-password
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            try
            {
                await _authService.ChangePasswordAsync(request);

                // 200 OK: การแก้ไขข้อมูลสำเร็จ
                return Ok(new { message = "เปลี่ยนรหัสผ่านสำเร็จ กรุณา Login ใหม่อีกครั้ง" });
            }
            catch (Exception ex)
            {
                // 400 Bad Request (เช่น รหัสเดิมผิด)
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}