using System.Text.Json.Serialization; // <--- 1. เพิ่มบรรทัดนี้

namespace StockApi.Dtos
{
    public class SystemLogDto
    {
        [JsonPropertyOrder(1)]
        public int Id { get; set; }

        [JsonPropertyOrder(2)]
        public string Action { get; set; } = string.Empty;

        [JsonPropertyOrder(3)]
        public string TableName { get; set; } = string.Empty;

        [JsonPropertyOrder(4)]
        public string RecordId { get; set; } = string.Empty;

        [JsonPropertyOrder(5)]
        public string OldValue { get; set; } = string.Empty;

        // *** อยากให้อยู่ตรงนี้ ใส่เลข 6, 7 ***
        [JsonPropertyOrder(6)]
        public string Withdraw { get; set; } = "+0";

        [JsonPropertyOrder(7)]
        public string Receive { get; set; } = "+0";

        [JsonPropertyOrder(8)]
        public string NewValue { get; set; } = string.Empty;

        [JsonPropertyOrder(9)]
        public string CreatedBy { get; set; } = string.Empty;

        [JsonPropertyOrder(10)]
        public string CreatedAt { get; set; } = string.Empty;
    }
}