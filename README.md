# 📦 IT Inventory & Asset Management System

A modern, fast, and responsive web application for managing IT equipment, tracking inventory transactions, handling borrow requests, and providing an integrated user support ticketing system. Built with React and Tailwind CSS.

## ✨ Key Features

### 📊 1. Dashboard & Item Management
* **CRUD Operations:** Create, read, update, and delete inventory items.
* **Smart Item Codes:** Support for manual entry or auto-generated `DRAFT-` item codes.
* **Draft Protection:** `DRAFT-` items are strictly validated and blocked from being used in active transactions or borrow requests until finalized.

### 🗄️ 2. Inventory Overview
* **Real-time Stock Tracking:** Monitor Total, Received, Withdrawn, Borrowed, and Balance quantities.
* **Dynamic Filtering & Sorting:** Filter items by active categories (dynamically fetched from the database) and sub-variants (e.g., SSD Interface, RAM Capacity).
* **Excel Export:** Export the current stock view to an `.xlsx` file with formatted columns.
* **Data Visualization:** Toggle between a detailed List view and a visual Analytics Chart view.

### 🔄 3. Transactions (Receive & Withdraw)
* **Multi-item Transactions:** Process multiple items in a single withdrawal or receive action.
* **Pending Receipts:** Manage pending items with required `Job No.` linking.
* **No Limits:** Flexible receiving quantities (users can receive more or fewer items than initially requested based on real-world scenarios).

### 📅 4. Borrowing System
* **Smart Due Dates:** Automatically calculates the return period and displays dynamic helper texts for expected email reminder schedules.
* **Real-time Validation:** Validates item availability and blocks restricted items instantly during form input.

### 🛟 5. Integrated Support Ticket System
* **User Portal:** Users can submit issue reports, track ticket status (Pending/Resolved), and communicate with the support team.
* **WebSupporter Portal:** Dedicated dashboard for the `WebSupporter` role to manage and reply to user tickets in real-time.
* **Interactive Star Rating:** After a ticket is resolved, users can rate the support service (from 0.5 to 5.0 stars) with smooth, interactive UI feedback.

---

## 🛠️ Tech Stack

* **Frontend Framework:** React.js (Vite)
* **Styling:** Tailwind CSS, `clsx`, `tailwind-merge`
* **Icons:** `lucide-react`
* **Data Export:** `xlsx` (SheetJS)
* **Routing:** React Router DOM
* **State Management:** React Hooks (`useState`, `useEffect`, `useMemo`) + Custom Context API
* **API Communication:** Fetch API with custom utility wrappers (`fetchUtils`)

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/yourusername/your-repo-name.git](https://github.com/yourusername/your-repo-name.git)
   cd your-repo-name
