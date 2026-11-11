import os
import sqlite3
from werkzeug.security import generate_password_hash

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chitral_educloud.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # 1. Schools table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS schools (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        name_urdu TEXT,
        campus_city TEXT NOT NULL,
        address TEXT NOT NULL,
        phone TEXT NOT NULL,
        principal_name TEXT NOT NULL,
        session_year TEXT NOT NULL DEFAULT '2026-2027',
        logo_text TEXT NOT NULL,
        bise_code TEXT,
        email TEXT,
        heating_levy INTEGER DEFAULT 800
    )
    ''')

    # 2. Users table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        school_id TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'parent')),
        full_name TEXT NOT NULL,
        linked_student_id TEXT,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
    )
    ''')

    # 3. Students table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        admission_no TEXT NOT NULL,
        roll_no TEXT NOT NULL,
        full_name TEXT NOT NULL,
        name_urdu TEXT,
        father_name TEXT NOT NULL,
        father_name_urdu TEXT,
        gender TEXT NOT NULL,
        class_grade TEXT NOT NULL,
        section TEXT NOT NULL,
        phone TEXT NOT NULL,
        blood_group TEXT,
        address TEXT,
        monthly_fee INTEGER NOT NULL DEFAULT 4500,
        status TEXT NOT NULL DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
    )
    ''')

    # 4. Attendance table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        school_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('P', 'A', 'L')),
        marked_by TEXT DEFAULT 'Class Teacher',
        arrival_time TEXT,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        UNIQUE(school_id, student_id, date)
    )
    ''')

    # 5. Fee Challans table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS fee_challans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        school_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        challan_no TEXT UNIQUE NOT NULL,
        month_year TEXT NOT NULL,
        tuition_fee INTEGER NOT NULL,
        arrears INTEGER NOT NULL DEFAULT 0,
        total_amount INTEGER NOT NULL,
        paid_amount INTEGER NOT NULL DEFAULT 0,
        balance INTEGER NOT NULL DEFAULT 0,
        payment_method TEXT CHECK(payment_method IN ('Cash', 'JazzCash', 'EasyPaisa', 'Bank of Khyber', NULL)),
        status TEXT NOT NULL DEFAULT 'UNPAID' CHECK(status IN ('PAID', 'PARTIAL', 'UNPAID')),
        paid_date TEXT,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    )
    ''')

    # 6. Exam Marks table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS exam_marks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        school_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        exam_term TEXT NOT NULL,
        english INTEGER NOT NULL DEFAULT 0,
        urdu INTEGER NOT NULL DEFAULT 0,
        math INTEGER NOT NULL DEFAULT 0,
        science INTEGER NOT NULL DEFAULT 0,
        islamiat INTEGER NOT NULL DEFAULT 0,
        computer_or_econ INTEGER NOT NULL DEFAULT 0,
        total_marks INTEGER NOT NULL DEFAULT 600,
        obtained_marks INTEGER NOT NULL DEFAULT 0,
        percentage REAL NOT NULL DEFAULT 0.0,
        grade TEXT NOT NULL DEFAULT 'F',
        remarks TEXT,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        UNIQUE(school_id, student_id, exam_term)
    )
    ''')

    # 7. Staff Payroll table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS staff_payroll (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        school_id TEXT NOT NULL,
        emp_id TEXT NOT NULL,
        full_name TEXT NOT NULL,
        designation TEXT NOT NULL,
        subject TEXT NOT NULL,
        phone TEXT NOT NULL,
        basic_salary INTEGER NOT NULL,
        allowances INTEGER NOT NULL DEFAULT 0,
        deductions INTEGER NOT NULL DEFAULT 0,
        net_salary INTEGER NOT NULL,
        payment_status TEXT NOT NULL DEFAULT 'Pending' CHECK(payment_status IN ('Paid', 'Pending')),
        paid_date TEXT,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
    )
    ''')

    # 8. Broadcast Logs table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS broadcast_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        school_id TEXT NOT NULL,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        message_text TEXT NOT NULL,
        target_group TEXT NOT NULL,
        recipient_count INTEGER NOT NULL DEFAULT 0,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
    )
    ''')

    conn.commit()

    # Ensure default Phase 4 seed users exist
    seed_users = [
        ("chitral-model", "admin", generate_password_hash("admin123"), "admin", "Prof. Rehmat Ullah Baig", None),
        ("chitral-model", "teacher", generate_password_hash("teach123"), "teacher", "Sir Farooq Azam", None),
        ("chitral-model", "parent", generate_password_hash("parent123"), "parent", "Mir Wazir Khan", "STU-1001"),
        ("chitral-model", "admin_cmc", generate_password_hash("admin123"), "admin", "Prof. Rehmat Ullah Baig", None),
        ("chitral-model", "teacher_farooq", generate_password_hash("teach123"), "teacher", "Sir Farooq Azam", None),
        ("chitral-model", "parent_wazir", generate_password_hash("parent123"), "parent", "Mir Wazir Khan", "STU-1001"),
    ]
    cursor.executemany('''
    INSERT OR IGNORE INTO users (school_id, username, password_hash, role, full_name, linked_student_id)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', seed_users)
    conn.commit()

    # Check if empty -> Seed DB
    cursor.execute("SELECT COUNT(*) FROM schools")
    count = cursor.fetchone()[0]
    if count == 0:
        seed_db(conn)

    conn.close()

def calculate_grade(percentage):
    if percentage >= 80:
        return 'A1'
    elif percentage >= 70:
        return 'A'
    elif percentage >= 60:
        return 'B'
    elif percentage >= 50:
        return 'C'
    elif percentage >= 33:
        return 'D'
    return 'F'

def seed_db(conn):
    cursor = conn.cursor()

    # Seed Schools
    schools_data = [
        ("chitral-model", "Chitral Model College & School", "چترال ماڈل کالج اینڈ اسکول", "Chitral Town", "Main Campus, Ataliq Bazaar Road, Chitral Town", "+92 (0943) 412580", "Prof. Rehmat Ullah Baig", "2026-2027", "CMC", "BISE Peshawar #CMC-4819", "info@chitralmodel.edu.pk", 800),
        ("pamir-valley", "Pamir Valley Public School Booni", "پامیر ویلی پبلک اسکول بونی (اپر چترال)", "Upper Chitral", "Booni Main Road, Upper Chitral", "+92 (0943) 470120", "Sir Afzal Khan Pamiri", "2026-2027", "PVS", "BISE Malakand #PVS-1102", "admin@pamirvalleyschool.edu.pk", 1000),
        ("hindukush", "Hindukush Public School Drosh", "ہندوکش پبلک اسکول دروش (لوئر چترال)", "Lower Chitral", "Drosh Bypass Road, Lower Chitral", "+92 (0943) 420950", "Madam Gulrukh Sultana", "2026-2027", "HPS", "BISE Peshawar #HPS-2041", "principal@hindukushdrosh.edu.pk", 700)
    ]
    cursor.executemany('''
    INSERT INTO schools (id, name, name_urdu, campus_city, address, phone, principal_name, session_year, logo_text, bise_code, email, heating_levy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', schools_data)

    # Seed Users
    users_data = [
        ("chitral-model", "admin", generate_password_hash("admin123"), "admin", "Prof. Rehmat Ullah Baig", None),
        ("chitral-model", "teacher", generate_password_hash("teach123"), "teacher", "Sir Farooq Azam", None),
        ("chitral-model", "parent", generate_password_hash("parent123"), "parent", "Mir Wazir Khan", "STU-1001"),
        ("chitral-model", "admin_cmc", generate_password_hash("admin123"), "admin", "Prof. Rehmat Ullah Baig", None),
        ("chitral-model", "teacher_farooq", generate_password_hash("teacher123"), "teacher", "Sir Farooq Azam", None),
        ("chitral-model", "parent_wazir", generate_password_hash("parent123"), "parent", "Mir Wazir Khan", "STU-1001"),
        ("pamir-valley", "admin_pamir", generate_password_hash("admin123"), "admin", "Sir Afzal Khan Pamiri", None),
        ("hindukush", "admin_drosh", generate_password_hash("admin123"), "admin", "Madam Gulrukh Sultana", None)
    ]
    cursor.executemany('''
    INSERT OR IGNORE INTO users (school_id, username, password_hash, role, full_name, linked_student_id)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', users_data)

    # Seed Students across schools
    students_data = [
        # Chitral Model College
        ("STU-1001", "chitral-model", "CMC-2024-0412", "101", "Aliyan Ali", "علیان علی", "Mir Wazir Khan", "میر وزیر خان", "Male", "Grade 10", "A", "0345-9821455", "O+", "Atani, Garam Chashma Road, Chitral", 4500, "Active"),
        ("STU-1002", "chitral-model", "CMC-2024-0418", "102", "Farhana Baig", "فرحانہ بیگ", "Afzal Baig", "افضل بیگ", "Female", "Grade 10", "A", "0346-8819234", "B+", "Singoor, Chitral Town", 4500, "Active"),
        ("STU-1003", "chitral-model", "CMC-2024-0422", "103", "Karim Ullah", "کریم اللہ", "Rehmat Karim", "رحمت کریم", "Male", "Grade 10", "A", "0343-9182736", "A+", "Danin, Chitral", 4500, "Active"),
        ("STU-1004", "chitral-model", "CMC-2024-0428", "104", "Shah Mir", "شاہ میر", "Ghulam Abbas", "غلام عباس", "Male", "Grade 10", "B", "0347-1234567", "AB+", "Drosh Road, Chitral", 4500, "Active"),
        ("STU-1005", "chitral-model", "CMC-2024-0435", "105", "Mehreen Bibi", "مہرین بی بی", "Sher Nadir", "شیر نادر", "Female", "Grade 9", "A", "0345-7766554", "O-", "Ayun Valley, Chitral", 4200, "Active"),
        ("STU-1006", "chitral-model", "CMC-2024-0440", "106", "Tariq Jamil", "طارق جمیل", "Sultan Murad", "سلطان مراد", "Male", "Grade 9", "A", "0342-9988112", "A-", "Jughoor, Chitral", 4200, "Active"),
        ("STU-1007", "chitral-model", "CMC-2024-0450", "107", "Zeeshan Ayub", "ذیشان ایوب", "Muhammad Ayub", "محمد ایوب", "Male", "FSc-I Pre-Medical", "Pre-Med", "0345-3344112", "B-", "Bakarabad, Chitral", 6500, "Active"),
        ("STU-1008", "chitral-model", "CMC-2024-0455", "108", "Sumaira Naz", "سمیرا ناز", "Fazal Rabbi", "فضل ربی", "Female", "Grade 9", "B", "0344-5566778", "O+", "Goldur, Chitral", 4200, "Active"),
        # Pamir Valley Booni
        ("STU-2001", "pamir-valley", "PVS-2024-0101", "201", "Inam Ul Haq", "انعام الحق", "Sher Wali Khan", "شیر ولی خان", "Male", "Grade 10", "A", "0348-1122334", "A+", "Booni Bazar, Upper Chitral", 3500, "Active"),
        ("STU-2002", "pamir-valley", "PVS-2024-0102", "202", "Areesha Noor", "عریشہ نور", "Qurban Ali", "قربان علی", "Female", "Grade 10", "A", "0349-2233445", "B+", "Reshun, Upper Chitral", 3500, "Active"),
        ("STU-2003", "pamir-valley", "PVS-2024-0103", "203", "Sohail Ahmad", "سہیل احمد", "Fida Muhammad", "فدا محمد", "Male", "Grade 9", "A", "0341-3344556", "O+", "Mastuj, Upper Chitral", 3200, "Active"),
        # Hindukush Drosh
        ("STU-3001", "hindukush", "HPS-2024-0201", "301", "Daniyal Azam", "دانیال اعظم", "Farooq Azam", "فاروق اعظم", "Male", "Grade 10", "A", "0340-4455667", "AB+", "Drosh Main, Lower Chitral", 3800, "Active"),
        ("STU-3002", "hindukush", "HPS-2024-0202", "302", "Salma Qureshi", "سلمی قریشی", "Sirajuddin", "سراج الدین", "Female", "Grade 10", "A", "0345-5566778", "O-", "Shishi Koh, Drosh", 3800, "Active")
    ]
    cursor.executemany('''
    INSERT INTO students (id, school_id, admission_no, roll_no, full_name, name_urdu, father_name, father_name_urdu, gender, class_grade, section, phone, blood_group, address, monthly_fee, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', students_data)

    # Seed Attendance (for today: 2026-10-12)
    today_date = "2026-10-12"
    attendance_data = [
        ("chitral-model", "STU-1001", today_date, "P", "Sir Farooq Azam", "08:14 AM"),
        ("chitral-model", "STU-1002", today_date, "P", "Sir Farooq Azam", "08:08 AM"),
        ("chitral-model", "STU-1003", today_date, "A", "Sir Farooq Azam", None),
        ("chitral-model", "STU-1004", today_date, "P", "Sir Farooq Azam", "08:10 AM"),
        ("chitral-model", "STU-1005", today_date, "P", "Madam Yasmin", "08:05 AM"),
        ("chitral-model", "STU-1006", today_date, "L", "Madam Yasmin", None),
        ("chitral-model", "STU-1007", today_date, "P", "Sir Farooq Azam", "08:11 AM"),
        ("chitral-model", "STU-1008", today_date, "P", "Madam Yasmin", "08:18 AM"),
        ("pamir-valley", "STU-2001", today_date, "P", "Sir Nasir", "08:15 AM"),
        ("pamir-valley", "STU-2002", today_date, "P", "Sir Nasir", "08:12 AM"),
        ("pamir-valley", "STU-2003", today_date, "P", "Sir Nasir", "08:20 AM"),
        ("hindukush", "STU-3001", today_date, "P", "Madam Gulrukh", "08:07 AM"),
        ("hindukush", "STU-3002", today_date, "P", "Madam Gulrukh", "08:09 AM")
    ]
    cursor.executemany('''
    INSERT INTO attendance (school_id, student_id, date, status, marked_by, arrival_time)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', attendance_data)

    # Seed Fee Challans (Month: October 2026)
    challans_data = [
        # student_id, school_id, challan_no, month_year, tuition, arrears, total, paid, balance, method, status, paid_date
        ("chitral-model", "STU-1001", "CH-2026-1049", "October 2026", 4500, 4500, 9000, 0, 9000, None, "UNPAID", None),
        ("chitral-model", "STU-1002", "CH-2026-1050", "October 2026", 4500, 0, 4500, 4500, 0, "JazzCash", "PAID", "2026-10-04"),
        ("chitral-model", "STU-1003", "CH-2026-1051", "October 2026", 4500, 9000, 13500, 0, 13500, None, "UNPAID", None),
        ("chitral-model", "STU-1004", "CH-2026-1052", "October 2026", 4500, 0, 4500, 4500, 0, "EasyPaisa", "PAID", "2026-10-02"),
        ("chitral-model", "STU-1005", "CH-2026-1053", "October 2026", 4200, 0, 4200, 4200, 0, "Cash", "PAID", "2026-10-05"),
        ("chitral-model", "STU-1006", "CH-2026-1054", "October 2026", 4200, 4200, 8400, 0, 8400, None, "UNPAID", None),
        ("chitral-model", "STU-1007", "CH-2026-1055", "October 2026", 6500, 0, 6500, 6500, 0, "JazzCash", "PAID", "2026-10-01"),
        ("chitral-model", "STU-1008", "CH-2026-1056", "October 2026", 4200, 0, 4200, 4200, 0, "Bank of Khyber", "PAID", "2026-10-06"),
        ("pamir-valley", "STU-2001", "CH-2026-2001", "October 2026", 3500, 0, 3500, 3500, 0, "Cash", "PAID", "2026-10-03"),
        ("pamir-valley", "STU-2002", "CH-2026-2002", "October 2026", 3500, 3500, 7000, 0, 7000, None, "UNPAID", None),
        ("pamir-valley", "STU-2003", "CH-2026-2003", "October 2026", 3200, 0, 3200, 3200, 0, "EasyPaisa", "PAID", "2026-10-08"),
        ("hindukush", "STU-3001", "CH-2026-3001", "October 2026", 3800, 0, 3800, 3800, 0, "Cash", "PAID", "2026-10-02"),
        ("hindukush", "STU-3002", "CH-2026-3002", "October 2026", 3800, 3800, 7600, 0, 7600, None, "UNPAID", None)
    ]
    cursor.executemany('''
    INSERT INTO fee_challans (school_id, student_id, challan_no, month_year, tuition_fee, arrears, total_amount, paid_amount, balance, payment_method, status, paid_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', challans_data)

    # Seed Exam Marks (First Term 2026)
    # english, urdu, math, science, islamiat, computer_or_econ
    exams_data = [
        ("chitral-model", "STU-1001", "First Term", 88, 85, 94, 89, 47, 45, 600, 448, 74.67, "A", "Outstanding problem solver in Geometry"),
        ("chitral-model", "STU-1002", "First Term", 95, 92, 98, 96, 49, 48, 600, 478, 79.67, "A", "Top in class essay composition"),
        ("chitral-model", "STU-1003", "First Term", 72, 78, 65, 70, 38, 39, 600, 362, 60.33, "B", "Needs more writing practice"),
        ("chitral-model", "STU-1004", "First Term", 86, 84, 91, 88, 45, 44, 600, 438, 73.00, "A", "Strong language skills"),
        ("chitral-model", "STU-1005", "First Term", 91, 94, 92, 90, 48, 46, 600, 461, 76.83, "A", "Exemplary handwriting"),
        ("chitral-model", "STU-1006", "First Term", 76, 82, 74, 79, 40, 41, 600, 392, 65.33, "B", "Good effort"),
        ("chitral-model", "STU-1007", "First Term", 89, 88, 92, 94, 47, 46, 600, 456, 76.00, "A", "Exceptional botany & zoology diagrams"),
        ("chitral-model", "STU-1008", "First Term", 85, 87, 88, 86, 44, 45, 600, 435, 72.50, "A", "Very creative"),
        ("pamir-valley", "STU-2001", "First Term", 82, 84, 86, 80, 42, 43, 600, 417, 69.50, "B", "Consistent performer"),
        ("pamir-valley", "STU-2002", "First Term", 90, 92, 94, 88, 46, 45, 600, 455, 75.83, "A", "High academic merit"),
        ("pamir-valley", "STU-2003", "First Term", 78, 80, 75, 76, 38, 40, 600, 387, 64.50, "B", "Good progress"),
        ("hindukush", "STU-3001", "First Term", 85, 88, 90, 84, 44, 43, 600, 434, 72.33, "A", "Well rounded student"),
        ("hindukush", "STU-3002", "First Term", 89, 91, 87, 86, 45, 46, 600, 444, 74.00, "A", "Excellent participation")
    ]
    cursor.executemany('''
    INSERT INTO exam_marks (school_id, student_id, exam_term, english, urdu, math, science, islamiat, computer_or_econ, total_marks, obtained_marks, percentage, grade, remarks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', exams_data)

    # Seed Staff Payroll
    payroll_data = [
        ("chitral-model", "EMP-01", "Sir Farooq Azam", "Sr Subject Specialist", "Physics & Math", "0345-9988776", 58000, 12000, 2000, 68000, "Paid", "2026-10-01"),
        ("chitral-model", "EMP-02", "Madam Yasmin Akhtar", "Head of Urdu Literature", "Urdu & Islamiat", "0346-1122334", 52000, 10000, 1500, 60500, "Paid", "2026-10-01"),
        ("chitral-model", "EMP-03", "Sir Nasiruddin", "English Lecturer", "English Compulsory", "0347-2233445", 48000, 8000, 0, 56000, "Paid", "2026-10-01"),
        ("chitral-model", "EMP-04", "Madam Shahida Parveen", "Biology / Chemist", "Biology & Chemistry", "0348-3344556", 46000, 8000, 1200, 52800, "Pending", None),
        ("chitral-model", "EMP-05", "Qari Muhammad Ismail", "Qari / Islamiat", "Tajweed & Quran", "0349-4455667", 35000, 5000, 0, 40000, "Paid", "2026-10-01"),
        ("pamir-valley", "EMP-101", "Sir Afzal Khan", "Principal / Math", "Mathematics", "0345-6677889", 55000, 10000, 0, 65000, "Paid", "2026-10-01"),
        ("hindukush", "EMP-201", "Madam Gulrukh", "Principal / English", "English", "0346-7788990", 54000, 9000, 0, 63000, "Paid", "2026-10-01")
    ]
    cursor.executemany('''
    INSERT INTO staff_payroll (school_id, emp_id, full_name, designation, subject, phone, basic_salary, allowances, deductions, net_salary, payment_status, paid_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', payroll_data)

    # Seed Broadcast Logs
    broadcast_data = [
        ("chitral-model", "PTM Invitation Notice", "Academics", "Dear Parents, First Term PTM is scheduled for Saturday 09:00 AM.", "All Parents", 684),
        ("chitral-model", "Monthly Fee Challan Due Reminder", "Finance", "Dear Parent, Monthly tuition fee voucher for October 2026 has been issued.", "Fee Defaulters", 42),
        ("chitral-model", "Chitral Snowfall & Severe Weather Closure Notice", "Emergency", "Due to heavy snowfall across Lowari Pass and Booni, the school will remain closed for two days.", "All Parents", 684)
    ]
    cursor.executemany('''
    INSERT INTO broadcast_logs (school_id, title, category, message_text, target_group, recipient_count)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', broadcast_data)

    conn.commit()
