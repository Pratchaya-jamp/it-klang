# 📦 Inventory & Equipment Management System

ระบบจัดการคลังอุปกรณ์ เบิก-จ่าย และติดตามสถานะการยืมคืน พร้อมระบบจัดการผู้ใช้งานและการแจ้งปัญหา (Support Ticket) 

## 🛠️ Tech Stack

*   **Backend:** .NET 9 (ASP.NET Core Web API)
*   **Database:** MySQL
*   **Deployment:** Docker & Docker Compose
*   **Network / Tunneling:** Tailscale Funnel

## 📋 Prerequisites (สิ่งที่ต้องมี)

ก่อนเริ่มต้น รบกวนตรวจสอบให้แน่ใจว่าเครื่องเซิร์ฟเวอร์หรือเครื่องสำหรับพัฒนา (Local) ได้ติดตั้งซอฟต์แวร์เหล่านี้แล้ว:

*   [.NET 9.0 SDK](https://dotnet.microsoft.com/en-us/download/dotnet/9.0)
*   [Docker Desktop](https://www.docker.com/products/docker-desktop) หรือ Docker Engine
*   [Tailscale](https://tailscale.com/) (สำหรับการทำ Funnel ออกสู่ภายนอก)

## ⚙️ Configuration (การตั้งค่าสภาพแวดล้อม)

ระบบจะจัดการ Environment Variables ผ่านไฟล์ `.env` อย่างเข้มงวดเพื่อความปลอดภัย (ห้ามตั้งค่าผ่าน Docker configurations โดยตรง)

1. สร้างไฟล์ `.env` ไว้ที่ Root Directory ของโปรเจค
2. คัดลอกและปรับแก้ตัวแปรด้านล่างนี้:
```env
# Database Configuration
DB_HOST=db
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_secure_password
DB_NAME=inventory_db

# Security & JWT
JWT_SECRET=your_super_secret_key_change_in_production
JWT_ISSUER=your_issuer

# Storage Configuration (ใช้ Local Volume)
STORAGE_PATH=/app/uploads
