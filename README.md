# 📦 IT-KLANG (IT Equipment Inventory Management)

**IT-KLANG** คือระบบบริหารจัดการคลังอุปกรณ์ไอทีส่วนกลาง (IT Operations Center) ที่ออกแบบมาเพื่อรองรับการเบิก-จ่าย, การยืม-คืน, การตัดจำหน่าย (Write-off) และการติดตามสถานะอุปกรณ์แบบเรียลไทม์ พร้อมทั้งมีระบบ User Management และระบบ Helpdesk (Support Ticket) ในตัว เพื่อให้การทำงานของฝ่าย IT Support เป็นไปอย่างมีประสิทธิภาพและตรวจสอบย้อนหลังได้

---

## 🎓 ข้อมูลโครงงานและการฝึกงาน (Project & Internship Details)

*   **นำเสนอ (Presented to):** อาจารย์ อัจฉรา ธารอุไรกุล
*   **มหาวิทยาลัย (University):** คณะเทคโนโลยีสารสนเทศ (SIT) มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี (KMUTT)
*   **ภายใต้บริษัท (Company):** บริษัท คอสโม กรุ๊ป จำกัด
*   **พี่เลี้ยง (Mentor):** นายนพดล รอดยอดสร้อย 
*   **ตำแหน่งพี่เลี้ยง (Mentor Position):** System Administrator
*   **ผู้จัดทำ (Developer):** นายปรัชญา จำปาเทศ
*   **ตำแหน่ง (Position):** Internship IT Support

---

## 🚀 ระบบมีอะไรบ้าง (System Features)

1.  **Dashboard & Inventory Management:** 
    *   ดูภาพรวมจำนวนอุปกรณ์, หมวดหมู่, และรายการล่าสุด
    *   เพิ่ม แก้ไข ลบ อุปกรณ์ (รองรับการทำ DRAFT Item ที่ระบบจะห้ามทำรายการจนกว่าจะอัปเดตเป็นตัวจริง)
2.  **Transaction & Stock Control (ระบบเบิก-จ่าย):**
    *   **Withdraw:** เบิกอุปกรณ์ออกไปใช้งานโดยผูกกับรหัสงาน (Job No)
    *   **Receive:** รับอุปกรณ์ที่ค้างจ่ายคืนเข้าสู่คลัง
    *   **Write-Off:** ตัดจำหน่ายอุปกรณ์ที่ชำรุด สูญหาย หรือเลิกผลิต พร้อมสรุปประวัติ (Write-off Summary)
3.  **Borrowing System (ระบบยืม-คืน):**
    *   ทำรายการขอยืม ระบุวันที่กำหนดคืน พร้อมแจ้งเตือนส่งอีเมลตามเงื่อนไขวัน
    *   บันทึกประวัติการยืมและการคืนอุปกรณ์
4.  **Support Tickets (ระบบแจ้งปัญหา):**
    *   ผู้ใช้สามารถสร้าง Ticket แจ้งปัญหาให้ฝ่าย IT ได้
    *   Admin สามารถตอบกลับ และผู้ใช้สามารถให้คะแนนความพึงพอใจ (Rating) ได้
5.  **User Management & Security (ระบบผู้ใช้งาน):**
    *   จัดการสิทธิ์ (Role-based access) เช่น SuperAdmin, User
    *   ตรวจสอบประวัติการเข้าสู่ระบบ (Login Logs / Audit)
    *   ระบบรีเซ็ตรหัสผ่านด้วย OTP โดย Admin และการตั้งรหัสผ่านใหม่

---

## 🛠️ Tech Stack

* **Frontend:**
    * [![React][React.js]][React-url]
    * [![Tailwind CSS][Tailwind.css]][Tailwind-url] (พร้อมใช้ Lucide Icons)
* **Backend:**
    * [![.NET][Dotnet]][Dotnet-url] (ASP.NET Core Web API 9.0)
* **Database:**
    * [![MySQL][Mysql.db]][Mysql-url] (ใช้งานร่วมกับ Entity Framework Core)
* **Deployment & Networking:**
    * [![Docker][Docker.com]][Docker-url] (ใช้ Local Volume สำหรับจัดการไฟล์)
    * [![Tailscale][Tailscale.com]][Tailscale-url] (Funnel สำหรับเปิด API สู่ Public แบบ HTTPS)

---

## 📡 API Endpoints 

### 🔐 Authentication & Users
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | เข้าสู่ระบบ |
| `GET` | `/api/auth/me` | ดึงข้อมูลผู้ใช้งานปัจจุบัน |
| `GET` | `/api/auth/admin/users` | ดึงข้อมูลผู้ใช้งานทั้งหมด (สำหรับ Admin) |
| `PUT` | `/api/auth/admin/users/{staffId}` | อัปเดตข้อมูลและสิทธิ์ผู้ใช้งาน |
| `POST` | `/api/auth/admin/request-otp` | ร้องขอ OTP เพื่อรีเซ็ตรหัสผ่านให้ผู้ใช้ (Admin) |
| `POST` | `/api/auth/admin/reset-password` | ยืนยัน OTP และให้ระบบสร้างรหัสผ่านใหม่ (Auto-gen) |
| `GET` | `/api/audit/login-logs` | ดึงประวัติการเข้าสู่ระบบ (กรองด้วย Staff ID ได้) |

### 📦 Inventory & Dashboard
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/items/dashboard` | ดึงรายการอุปกรณ์ทั้งหมด (รองรับ Query Params เพื่อ Search/Filter) |
| `POST` | `/api/items` | เพิ่มอุปกรณ์ใหม่ (รองรับการปล่อยว่างให้ระบบ Auto-gen รหัสได้) |
| `PUT` | `/api/items/{code}` | แก้ไขข้อมูลอุปกรณ์ |
| `DELETE`| `/api/items/{code}` | ลบอุปกรณ์ออกจากระบบ |
| `GET` | `/api/stocks/overview` | ดึงข้อมูลรายการอุปกรณ์ทั้งหมดสำหรับการเลือกทำรายการ |

### 🔄 Transactions (เบิก/รับ/ตัดจำหน่าย)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/transactions/pending` | ดึงรายการค้างจ่าย (Pending) ทั้งหมด |
| `POST` | `/api/transactions/withdraw` | ทำรายการเบิกจ่ายอุปกรณ์ออกไปใช้งาน |
| `POST` | `/api/transactions/receive` | ทำรายการรับอุปกรณ์ค้างจ่ายกลับเข้าสต็อก |
| `POST` | `/api/transactions/write-off` | ทำรายการตัดจำหน่ายอุปกรณ์ทิ้ง (บังคับกรอก Note) |
| `GET` | `/api/transactions/write-off/summary`| ดึงประวัติและยอดรวมของการตัดจำหน่ายทั้งหมด |

### 🤝 Borrowing (ยืม-คืน)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/borrow/history` | ดึงประวัติการยืม-คืนอุปกรณ์ทั้งหมด |
| `POST` | `/api/borrow/request` | สร้างคำขอยืมอุปกรณ์ใหม่ (ระบุ Due Date) |
| `POST` | `/api/borrow/return/{id}` | ทำรายการคืนอุปกรณ์ |

### 🎫 Support Tickets (ระบบแจ้งปัญหา)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/support/my-tickets` | ดึงรายการ Ticket ของผู้ใช้งานปัจจุบัน |
| `GET` | `/api/support/tickets` | ดึงรายการ Ticket ทั้งหมดในระบบ (Admin) |
| `POST` | `/api/support/ticket` | สร้างรายการแจ้งปัญหาใหม่ |
| `PUT` | `/api/support/ticket/{ticketNo}/reply`| ตอบกลับการแจ้งปัญหา (Admin) |
| `POST` | `/api/support/ticket/{ticketNo}/rate` | ผู้ใช้งานให้คะแนนประเมินการแก้ปัญหา (1-5 ดาว) |

<!-- MARKDOWN LINKS & IMAGES -->
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://reactjs.org/
[Tailwind.css]: https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white
[Tailwind-url]: https://tailwindcss.com/
[Dotnet]: https://img.shields.io/badge/.NET_9-512BD4?style=for-the-badge&logo=dotnet&logoColor=white
[Dotnet-url]: https://dotnet.microsoft.com/
[Mysql.db]: https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white
[Mysql-url]: https://www.mysql.com/
[Docker.com]: https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white
[Docker-url]: https://www.docker.com/
[Tailscale.com]: https://img.shields.io/badge/Tailscale-191919?style=for-the-badge&logo=tailscale&logoColor=white
[Tailscale-url]: https://tailscale.com/
