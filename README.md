# Chitral EduCloud / Smart School ERP 🏔️🎒
### Commercial Multi-School Management System tailored for Private Schools in Chitral, Khyber Pakhtunkhwa, Pakistan

---

## 🌟 Overview
**Chitral EduCloud** is a commercial-grade, multi-tenant school enterprise resource planning (ERP) platform designed specifically for the unique educational and geographical context of **Chitral (Upper and Lower)**, KP, Pakistan.

The system features **instant 1-click bilingual support (English LTR ⇄ اردو RTL with Noto Nastaliq Urdu typography)**, local Chitral multi-campus tenancy, financials denominated in **PKR**, winter heating fuel levies, snowfall closure broadcasts, and BISE Peshawar / Malakand board compliance.

---

## 🛠️ Architecture & Tech Stack
- **Backend:** Python Flask running on dedicated **port 5050** (`http://127.0.0.1:5050`) to avoid default port 5000 conflicts.
- **Frontend:** Zero-build single page application (SPA) with modular reactive state.
- **CSS & UI:** Tailwind CSS + Emerald/Teal & Slate Enterprise SaaS theme + custom glassmorphic headers.
- **Icons:** FontAwesome 6 Pro & Lucide icons.
- **Charts:** Chart.js for real-time financial and attendance analytics.
- **QR Codes:** Live client-side QRCode.js for scannable, verifiable PVC Student ID cards.
- **Typography:** Google Fonts *Plus Jakarta Sans* (English) + *Noto Nastaliq Urdu* / *Noto Sans Arabic* (Crisp Urdu RTL).

---

## 🖥️ All 13 Interactive Screens Included

1. **Login & Multi-Tenant Authentication:**
   - Multi-tenant school switcher (`Chitral Model College & School`, `Pamir Valley Public School Booni`, `Hindukush Public School Drosh`).
   - 1-Click demo role launchers for **School Admin (Principal)**, **Class Teacher**, and **Parent/Guardian**.

2. **School Admin Dashboard:**
   - 4 Dynamic KPI Cards: Enrolled Students (Boys/Girls breakdown), Today's Attendance Rate (Present vs. Absent counts), Monthly Fee Collection in PKR, and Outstanding Dues / Defaulters.
   - Interactive Chart.js Fee Collection Trends (PKR) and Grade-Wise Attendance Distribution.
   - Operational shortcuts and real-time live activity feed.

3. **Student Information System (SIS):**
   - Searchable, filterable student roster by name, roll number, class, and fee status.
   - Action buttons for 360° Profile, Digital ID Card, and Fee Ledger.
   - Excel / CSV export functionality.
   - "+ Register New Student" modal form with immediate state enrollment.

4. **Student 360° Comprehensive Profile:**
   - Official credentials, B-Form / CNIC, blood group, emergency contact, and Chitral village location.
   - Tabbed ledgers: Personal Bio, Attendance Log (168 days present, 4 absences), Fee Vouchers Ledger, and Exam DMC history.

5. **Digital Student PVC Card with QR Code:**
   - Dual-sided print-ready PVC card design (CR80 standard 85.6mm x 53.98mm).
   - Real-time scannable QR Code dynamically rendered with verified student enrollment data.
   - Dedicated `@media print` styling for clean physical printing.

6. **Parent Smartphone Portal (Mobile-First):**
   - Responsive smartphone view optimized for parents.
   - Multi-child switcher (e.g. Aliyan Ali vs. Mehreen Bibi).
   - Arrival punctuality status badge ("Present at 08:14 AM").
   - Pending fee voucher with 1-click **JazzCash / EasyPaisa / Bank Deposit** online payment modal.
   - Daily homework diary and direct WhatsApp helpline button.

7. **Teacher Faculty Workspace:**
   - Profile greeting with assigned classes and subject allocations.
   - Daily timetable schedule with "Completed", "Ongoing", and "Upcoming" period statuses.
   - Quick shortcuts for class attendance and marks entry.

8. **Daily Class Attendance Register:**
   - Interactive 1-click toggle buttons: **Present (P)**, **Absent (A)**, and **Leave (L)**.
   - "Mark All Present" bulk action.
   - Real-time counters for Present, Absent, and Leave.
   - Instant automated SMS absence alerts simulation.

9. **Fee Management & Financial Accounting:**
   - Searchable fee ledger with live collection workflow.
   - Multi-channel collection: **Cash at Desk**, **JazzCash**, **EasyPaisa**, and **Bank of Khyber (BOK)**.
   - **80mm Thermal POS Receipt Slip** generation and print preview.
   - **A4 3-Copy Bank Challan** generation (School Copy, Bank Copy, Student Copy).
   - Bulk monthly challan generator for October 2026.
   - Teaching staff payroll summary ledger.

10. **Examination & Results Processing:**
    - Exam Term selector (First Term, Mid-Term, Annual Board Exam).
    - Subject selector with interactive marks entry grid (Theory 75 + Practical 25).
    - Automatic real-time percentage and grade (A+, A, B, C, D, F) recalculation.

11. **Official Detailed Marks Certificate (DMC):**
    - Board-standard printable report card with Islamic Bismillah, institution crest, and BISE affiliation.
    - Full subject marks breakdown, total marks obtained, percentage, and class merit position.
    - Official Class Teacher and Principal signature lines with institution seal.

12. **WhatsApp & SMS Broadcast Communications Hub:**
    - Pre-built contextual templates tailored for Chitral (Snowfall & Lowari road closure emergency notices, fee reminders, student absence alerts, PTM invites).
    - Live WhatsApp chat bubble preview with instant English / Urdu preview toggling.
    - Broadcast execution simulator with sent log history.

13. **Multi-Tenant School Settings:**
    - Campus profile editor (School name, physical address, BISE affiliation code, helpline).
    - Winter heating fuel levy adjustment.
    - Encrypted JSON database backup download.
    - 1-Click reset to default demo dataset.

---

## 🚀 How to Run Locally

### Prerequisites
- Python 3.8+ (Python 3.11 tested)

### Installation & Launch
1. Open PowerShell / Command Prompt inside the directory:
   ```bash
   cd "C:\Users\It Hub\Documents\Chitral-School-Management"
   ```
2. Install dependencies (Flask):
   ```bash
   pip install -r requirements.txt
   ```
3. Start the server:
   ```bash
   python app.py
   ```
4. Open your web browser and navigate to:
   ```
   http://127.0.0.1:5050
   ```

---

## 🌍 Chitral Regional Context Highlights
- **Winter Heating Charges:** Schools in Chitral (Booni, Mastuj, Drosh, Garam Chashma) operate through cold Himalayan/Hindukush winters; the system accommodates regional heating fuel levies on fee vouchers.
- **Bilingual & RTL:** Instant toggle between English and Urdu (Nastaliq script) so local staff and Urdu-reading parents can interact naturally.
- **Affiliation Standard:** Pre-configured for BISE Peshawar and BISE Malakand board formats.
- **Weather Alerts:** Specialized emergency broadcast templates for Lowari tunnel closures and high-altitude snowfall.

---
*Built with ❤️ for education in Chitral, Khyber Pakhtunkhwa.*
