using System.Security.Cryptography;
using System.Text;
using Konscious.Security.Cryptography;

namespace StockApi.Utilities
{
    public static class PasswordHasher
    {
        // สูตรเน้นความเร็ว (Fastest)
        private const int DegreeOfParallelism = 2; // ใช้ CPU แค่ 1 Core (ลด Overhead การสลับ Thread)
        private const int Iterations = 4;          // วนรอบเดียวจบ (Minimum)
        private const int MemorySize = 64 * 1024;  // ใช้ RAM แค่ 16 MB (น้อยมาก)

        public static string HashPassword(string password)
        {
            var salt = CreateSalt();
            var argon2 = new Argon2id(Encoding.UTF8.GetBytes(password))
            {
                Salt = salt,
                DegreeOfParallelism = DegreeOfParallelism,
                Iterations = Iterations,
                MemorySize = MemorySize
            };

            var hash = argon2.GetBytes(16);
            return $"{Convert.ToBase64String(salt)}|{Convert.ToBase64String(hash)}";
        }

        public static bool VerifyPassword(string password, string storedHash)
        {
            try
            {
                var parts = storedHash.Split('|');
                if (parts.Length != 2) return false;

                var salt = Convert.FromBase64String(parts[0]);
                var expectedHash = Convert.FromBase64String(parts[1]);

                var argon2 = new Argon2id(Encoding.UTF8.GetBytes(password))
                {
                    Salt = salt,
                    DegreeOfParallelism = DegreeOfParallelism,
                    Iterations = Iterations,
                    MemorySize = MemorySize
                };

                var newHash = argon2.GetBytes(16);
                return newHash.SequenceEqual(expectedHash);
            }
            catch
            {
                return false;
            }
        }

        private static byte[] CreateSalt()
        {
            var buffer = new byte[16];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(buffer);
            return buffer;
        }
    }
}