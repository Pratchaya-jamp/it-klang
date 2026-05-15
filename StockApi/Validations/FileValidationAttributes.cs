using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace StockApi.Validations
{
    // 🔥 1. คลาสตรวจสอบขนาดไฟล์
    public class MaxFileSizeAttribute : ValidationAttribute
    {
        private readonly int _maxFileSize;
        public MaxFileSizeAttribute(int maxFileSize)
        {
            _maxFileSize = maxFileSize;
        }

        protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
        {
            var file = value as IFormFile;
            if (file != null)
            {
                if (file.Length > _maxFileSize)
                {
                    // แปลง Byte เป็น MB เพื่อแสดงข้อความให้ผู้ใช้เข้าใจง่าย
                    return new ValidationResult($"ขนาดไฟล์รูปภาพต้องไม่เกิน {_maxFileSize / 1024 / 1024} MB");
                }
            }
            return ValidationResult.Success;
        }
    }

    // 🔥 2. คลาสตรวจสอบนามสกุลไฟล์ (ป้องกันคนอัปโหลด .exe หรือไฟล์อันตราย)
    public class AllowedExtensionsAttribute : ValidationAttribute
    {
        private readonly string[] _extensions;
        public AllowedExtensionsAttribute(string[] extensions)
        {
            _extensions = extensions;
        }

        protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
        {
            var file = value as IFormFile;
            if (file != null)
            {
                var extension = Path.GetExtension(file.FileName);
                if (!_extensions.Contains(extension.ToLower()))
                {
                    return new ValidationResult($"รองรับเฉพาะไฟล์นามสกุล: {string.Join(", ", _extensions)} เท่านั้น");
                }
            }
            return ValidationResult.Success;
        }
    }
}