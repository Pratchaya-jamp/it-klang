using System.Diagnostics;

namespace StockApi.Middlewares
{
    public class RequestLoggingMiddleware
    {
        private readonly RequestDelegate _next;

        public RequestLoggingMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task Invoke(HttpContext context)
        {
            // 1. จับเวลาเริ่มต้น
            var stopwatch = Stopwatch.StartNew();

            // 2. Log Request (ขาเข้า) -> สีฟ้า Cyan
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine($"[--> REQ] {context.Request.Method} {context.Request.Path}");
            Console.ResetColor();

            // 3. ปล่อยให้ระบบทำงานต่อไป (ไปยัง Controller -> Database)
            try
            {
                await _next(context);
            }
            finally
            {
                // 4. หยุดเวลาเมื่อทำงานเสร็จ
                stopwatch.Stop();
                var statusCode = context.Response.StatusCode;

                // 5. เลือกสีตาม Status Code (ขาออก)
                if (statusCode >= 200 && statusCode < 300)
                {
                    Console.ForegroundColor = ConsoleColor.Green; // 2xx สีเขียว (ผ่าน)
                }
                else if (statusCode >= 400 && statusCode < 500)
                {
                    Console.ForegroundColor = ConsoleColor.Yellow; // 4xx สีเหลือง (Client ผิด)
                }
                else if (statusCode >= 500)
                {
                    Console.ForegroundColor = ConsoleColor.Red;   // 5xx สีแดง (Server พัง)
                }

                // 6. Log Response พร้อมเวลาที่ใช้ (ms)
                Console.WriteLine($"[<-- RES] {statusCode} {context.Request.Method} {context.Request.Path} ({stopwatch.ElapsedMilliseconds} ms)");

                // คืนค่าสีเดิม
                Console.ResetColor();
                Console.WriteLine(new string('-', 50)); // ขีดเส้นคั่นสวยๆ
            }
        }
    }
}