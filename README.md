# Chitral EduCloud / Smart School ERP 🏔️🎒
### Commercial Multi-School Management System tailored for Private Schools in Chitral, Khyber Pakhtunkhwa, Pakistan

---

## 🌟 Overview
**Chitral EduCloud** is a commercial-grade, multi-tenant school enterprise resource planning (ERP) platform designed specifically for the unique educational and geographical context of **Chitral (Upper and Lower)**, KP, Pakistan.

The system features **full SQLite database persistence (`chitral_educloud.db`)**, complete **Flask REST APIs**, **instant 1-click bilingual support (English LTR ⇄ اردو RTL with Noto Nastaliq Urdu typography)**, local Chitral multi-campus tenancy, financials denominated in **PKR**, winter heating fuel levies, snowfall closure broadcasts, and BISE Peshawar / Malakand board compliance.

---

## 🛠️ Architecture & Tech Stack (Phase 2)
- **Database:** SQLite relational engine (`chitral_educloud.db`) with multi-tenant scoping and automatic seeding.
- **Backend:** Python Flask running on dedicated **port 5050** (`http://127.0.0.1:5050`) with RESTful CRUD endpoints.
- **Frontend:** Zero-build single page application (SPA) with reactive `fetch()` bindings to the backend.
- **CSS & UI:** Tailwind CSS + Emerald/Teal & Slate Enterprise SaaS theme + custom glassmorphic headers.
- **Icons:** FontAwesome 6 Pro & Lucide icons.
- **Charts:** Chart.js for real-time financial and attendance analytics.
- **QR Codes:** Live client-side QRCode.js for scannable, verifiable PVC Student ID cards.
- **Typography:** Google Fonts *Plus Jakarta Sans* (English) + *Noto Nastaliq Urdu* / *Noto Sans Arabic* (Crisp Urdu RTL).

---

## 🗄️ Database Schema (`chitral_educloud.db`)
1. **`schools`**: `id`, `name`, `name_urdu`, `campus_city`, `address`, `phone`, `principal_name`, `session_year`, `logo_text`, `bise_code`, `email`, `heating_levy`
2. **`users`**: `id`, `school_id`, `username`, `password_hash`, `role` (`admin`, `teacher`, `parent`), `full_name`, `linked_student_id`
3. **`students`**: `id`, `school_id`, `admission_no`, `roll_no`, `full_name`, `name_urdu`, `father_name`, `father_name_urdu`, `gender`, `class_grade`, `section`, `phone`, `blood_group`, `address`, `monthly_fee`, `status`, `created_at`
4. **`attendance`**: `id`, `school_id`, `student_id`, `date`, `status` (`P`, `A`, `L`), `marked_by`, `arrival_time`
5. **`fee_challans`**: `id`, `school_id`, `student_id`, `challan_no`, `month_year`, `tuition_fee`, `arrears`, `total_amount`, `paid_amount`, `balance`, `payment_method` (`Cash`, `JazzCash`, `EasyPaisa`, `Bank of Khyber`), `status` (`PAID`, `PARTIAL`, `UNPAID`), `paid_date`
6. **`exam_marks`**: `id`, `school_id`, `student_id`, `exam_term`, `english`, `urdu`, `math`, `science`, `islamiat`, `computer_or_econ`, `total_marks`, `obtained_marks`, `percentage`, `grade`, `remarks`
7. **`staff_payroll`**: `id`, `school_id`, `emp_id`, `full_name`, `designation`, `subject`, `phone`, `basic_salary`, `allowances`, `deductions`, `net_salary`, `payment_status`, `paid_date`
8. **`broadcast_logs`**: `id`, `school_id`, `title`, `category`, `message_text`, `target_group`, `recipient_count`, `sent_at`

---

## 🔌 RESTful API Endpoints
- `GET /api/bootstrap?school_id=<id>&date=<date>` — Fetches school data, live SQLite KPIs, student rosters, challans, marks, payroll, and logs.
- `POST /api/students` — Enrolls a new student, auto-generates admission number, initial fee challan, and default exam record.
- `PUT /api/students/<id>` & `DELETE /api/students/<id>` — Updates or removes student records.
- `POST /api/attendance/save` — Batch records class attendance into SQLite with arrival times.
- `POST /api/fees/collect` — Records fee collection with payment methods (Cash, JazzCash, EasyPaisa, Bank of Khyber).
- `POST /api/fees/generate-challans` — Generates monthly fee challans for all active students with winter heating levy.
- `POST /api/exams/save` — Records exam marks, auto-calculating total, percentage, and BISE grade (`A1`, `A`, `B`, `C`, `D`, `F`).
- `POST /api/staff/pay` — Dispatches staff salary and marks status as `Paid`.
- `POST /api/broadcasts/send` — Dispatches and logs announcements.
- `PUT /api/schools/<id>` — Updates school configurations.
- `GET /api/backup/export` — Downloads full JSON database backup.

---

## 🖥️ All 13 Interactive Screens (Database-Connected)
1. **Login & Multi-Tenant Authentication View**
2. **School Admin Dashboard (Live SQLite KPIs & Chart.js graphs)**
3. **Student Information System (Search, Filter, Add, Edit, Delete)**
4. **Student 360° Comprehensive Profile**
5. **Digital Student PVC Card with QR Code**
6. **Parent Smartphone Portal (Mobile-First)**
7. **Teacher Faculty Workspace**
8. **Daily Class Attendance Register (1-Click P/A/L)**
9. **Fee Management & Financial Accounting (Thermal Receipt & 3-Copy Bank Challan)**
10. **Examination & Results Processing (Grid Marks & BISE Grade)**
11. **Official Detailed Marks Certificate (Printable DMC)**
12. **WhatsApp & SMS Broadcast Communications Hub**
13. **Multi-Tenant School Settings & Data Backup**

---

## 🚀 How to Run Locally
1. Start the server:
   ```bash
   python app.py
   ```
2. Open your browser:
   ```
   http://127.0.0.1:5050
   ```

---
*Built with ❤️ for education in Chitral, Khyber Pakhtunkhwa.*
