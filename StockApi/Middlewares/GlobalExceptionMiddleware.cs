using System.Net;
using System.Text.Json;
using StockApi.Exceptions;

namespace StockApi.Middlewares
{
    public class GlobalExceptionMiddleware
    {
        private readonly RequestDelegate _next;

        public GlobalExceptionMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task Invoke(HttpContext context)
        {
            try
            {
                // ปล่อยให้ Request ทำงานไปตามปกติ
                await _next(context);
            }
            catch (Exception error)
            {
                // ถ้ามี Error หลุดออกมา ให้จับไว้ที่นี่
                await HandleExceptionAsync(context, error);
            }
        }

        private static Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            context.Response.ContentType = "application/json";

            // กำหนด Default เป็น 500 (Internal Server Error)
            int statusCode = (int)HttpStatusCode.InternalServerError;
            var response = new
            {
                statusCode = statusCode,
                message = "Internal Server Error",
                details = exception.Message // ใน Production อาจจะซ่อนตรงนี้
            };

            // เช็คประเภท Error เพื่อเปลี่ยน Status Code
            switch (exception)
            {
                case NotFoundException: // 404
                    statusCode = (int)HttpStatusCode.NotFound;
                    break;

                case BadRequestException: // 400
                    statusCode = (int)HttpStatusCode.BadRequest;
                    break;

                case BusinessRuleException: // 409 Conflict หรือ 422 Unprocessable Entity
                    statusCode = (int)HttpStatusCode.Conflict;
                    break;
            }

            context.Response.StatusCode = statusCode;

            // สร้าง JSON Response ใหม่ที่อ่านง่าย
            var result = JsonSerializer.Serialize(new
            {
                statusCode = statusCode,
                message = exception.Message // ข้อความที่เขียนตอน throw
            });

            return context.Response.WriteAsync(result);
        }
    }
}