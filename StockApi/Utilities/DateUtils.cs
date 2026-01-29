using System.Globalization;

namespace StockApi.Utilities
{
    public static class DateUtils
    {
        // ฟังก์ชันดึงเวลาปัจจุบันแบบ Bangkok Time (UTC+7) เสมอ
        public static DateTime BangkokNow
        {
            get
            {
                return DateTime.UtcNow.AddHours(7);
            }
        }

        // ฟังก์ชันจัด Format วันที่แบบไทยๆ (29/01/2026 13:30:00)
        public static string ToThaiString(this DateTime dt)
        {
            // ถ้าใน DB เก็บเป็น UTC หรือ Server เป็น UTC ให้บวก 7 ก่อนแสดงผล
            // แต่ถ้า DB คุณเก็บเวลาไทยอยู่แล้ว ก็ไม่ต้อง .AddHours(7) 
            // เอาชัวร์ที่สุดสำหรับ Display คือเช็คหน้างาน หรือใช้สูตรนี้ถ้า Server เป็น UTC
            return dt.ToString("dd/MM/yyyy HH:mm:ss", new CultureInfo("en-US"));
        }
    }
}