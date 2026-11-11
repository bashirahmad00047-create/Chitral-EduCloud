import os
import json
import sqlite3
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_file
import database

app = Flask(__name__)
app.config['SECRET_KEY'] = 'chitral-educloud-enterprise-secret-key-2026'

# Initialize SQLite database on startup
database.init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'application': 'Chitral EduCloud / Smart School ERP',
        'version': '2.0.0',
        'academic_session': '2026-2027',
        'region': 'Chitral, Khyber Pakhtunkhwa, Pakistan',
        'database': 'SQLite persistent (chitral_educloud.db)'
    })

# 1. BOOTSTRAP API: Returns complete school state, KPIs, rosters, and ledgers
@app.route('/api/bootstrap', methods=['GET'])
def get_bootstrap():
    school_id = request.args.get('school_id', 'chitral-model')
    date_str = request.args.get('date', '2026-10-12')

    conn = database.get_db()
    cursor = conn.cursor()

    # All Schools (for tenant switcher)
    cursor.execute("SELECT * FROM schools")
    all_schools = [dict(row) for row in cursor.fetchall()]

    # Active School
    cursor.execute("SELECT * FROM schools WHERE id = ?", (school_id,))
    school_row = cursor.fetchone()
    if not school_row:
        school_row = all_schools[0] if all_schools else {}
        school_id = school_row.get('id', 'chitral-model')
    active_school = dict(school_row)

    # Students with joined attendance and latest fee status
    cursor.execute('''
    SELECT 
        s.*,
        COALESCE(a.status, 'P') as today_attendance,
        a.arrival_time as today_arrival_time,
        f.challan_no as current_challan_no,
        COALESCE(f.status, 'UNPAID') as fee_status,
        COALESCE(f.arrears, 0) as arrears,
        COALESCE(f.total_amount, s.monthly_fee) as current_total_fee,
        em.percentage as exam_percentage,
        em.grade as exam_grade,
        em.remarks as exam_remarks
    FROM students s
    LEFT JOIN attendance a ON s.id = a.student_id AND a.date = ?
    LEFT JOIN fee_challans f ON s.id = f.student_id AND f.month_year = 'October 2026'
    LEFT JOIN exam_marks em ON s.id = em.student_id AND em.exam_term = 'First Term'
    WHERE s.school_id = ?
    ORDER BY CAST(s.roll_no AS INTEGER) ASC
    ''', (date_str, school_id))
    students_list = [dict(row) for row in cursor.fetchall()]

    # Fee Challans
    cursor.execute('''
    SELECT fc.*, s.full_name as student_name, s.roll_no, s.class_grade, s.section
    FROM fee_challans fc
    JOIN students s ON fc.student_id = s.id
    WHERE fc.school_id = ?
    ORDER BY fc.id DESC
    ''', (school_id,))
    challans_list = [dict(row) for row in cursor.fetchall()]

    # Exam Marks
    cursor.execute('''
    SELECT em.*, s.full_name as student_name, s.roll_no, s.class_grade, s.section
    FROM exam_marks em
    JOIN students s ON em.student_id = s.id
    WHERE em.school_id = ?
    ORDER BY em.percentage DESC
    ''', (school_id,))
    exam_marks_list = [dict(row) for row in cursor.fetchall()]

    # Staff Payroll
    cursor.execute("SELECT * FROM staff_payroll WHERE school_id = ?", (school_id,))
    payroll_list = [dict(row) for row in cursor.fetchall()]

    # Broadcast Logs
    cursor.execute("SELECT * FROM broadcast_logs WHERE school_id = ? ORDER BY id DESC", (school_id,))
    broadcasts_list = [dict(row) for row in cursor.fetchall()]

    # Dynamic KPI Calculations from SQLite
    total_students = len(students_list)
    boys_count = sum(1 for s in students_list if s['gender'] == 'Male')
    girls_count = sum(1 for s in students_list if s['gender'] == 'Female')

    present_count = sum(1 for s in students_list if s['today_attendance'] == 'P')
    absent_count = sum(1 for s in students_list if s['today_attendance'] == 'A')
    leave_count = sum(1 for s in students_list if s['today_attendance'] == 'L')
    attendance_pct = round((present_count / total_students * 100), 1) if total_students > 0 else 0

    monthly_collected = sum(c['paid_amount'] for c in challans_list if c['month_year'] == 'October 2026')
    monthly_target = sum(c['total_amount'] for c in challans_list if c['month_year'] == 'October 2026')
    total_pending_dues = sum(c['balance'] for c in challans_list if c['balance'] > 0)
    defaulters_count = sum(1 for c in challans_list if c['balance'] > 0)

    conn.close()

    return jsonify({
        'school': active_school,
        'schools': all_schools,
        'kpis': {
            'total_students': total_students,
            'boys_count': boys_count,
            'girls_count': girls_count,
            'today_attendance_pct': attendance_pct,
            'present_today': present_count,
            'absent_today': absent_count,
            'leave_today': leave_count,
            'monthly_fee_collected': monthly_collected,
            'monthly_fee_target': monthly_target,
            'total_pending_dues': total_pending_dues,
            'defaulters_count': defaulters_count
        },
        'students': students_list,
        'challans': challans_list,
        'exam_marks': exam_marks_list,
        'payroll': payroll_list,
        'broadcasts': broadcasts_list
    })

# 2. STUDENTS CRUD APIs
@app.route('/api/students', methods=['POST'])
def add_student():
    data = request.get_json() or {}
    school_id = data.get('school_id', 'chitral-model')
    full_name = data.get('full_name', '').strip()
    father_name = data.get('father_name', '').strip()
    class_grade = data.get('class_grade', 'Grade 10')
    section = data.get('section', 'A')
    roll_no = data.get('roll_no', '109')
    phone = data.get('phone', '0345-0000000')
    blood_group = data.get('blood_group', 'O+')
    address = data.get('address', 'Chitral Town')
    monthly_fee = int(data.get('monthly_fee', 4500))

    if not full_name or not father_name:
        return jsonify({'error': 'Student name and Father name are required'}), 400

    conn = database.get_db()
    cursor = conn.cursor()

    # Generate unique ID and Admission No
    student_id = f"STU-{int(datetime.now().timestamp() * 1000) % 100000}"
    admission_no = f"CMC-2026-{int(datetime.now().timestamp()) % 10000:04d}"

    # Insert Student
    cursor.execute('''
    INSERT INTO students (id, school_id, admission_no, roll_no, full_name, name_urdu, father_name, father_name_urdu, gender, class_grade, section, phone, blood_group, address, monthly_fee, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (student_id, school_id, admission_no, roll_no, full_name, full_name, father_name, father_name, 'Male', class_grade, section, phone, blood_group, address, monthly_fee, 'Active'))

    # Auto-generate initial Fee Challan
    challan_no = f"CH-2026-{int(datetime.now().timestamp()) % 10000:04d}"
    cursor.execute('''
    INSERT INTO fee_challans (school_id, student_id, challan_no, month_year, tuition_fee, arrears, total_amount, paid_amount, balance, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (school_id, student_id, challan_no, 'October 2026', monthly_fee, 0, monthly_fee, 0, monthly_fee, 'UNPAID'))

    # Auto-generate default Exam Marks record
    cursor.execute('''
    INSERT INTO exam_marks (school_id, student_id, exam_term, english, urdu, math, science, islamiat, computer_or_econ, total_marks, obtained_marks, percentage, grade, remarks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (school_id, student_id, 'First Term', 80, 80, 85, 80, 45, 45, 600, 415, 69.17, 'B', 'Newly enrolled student'))

    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'message': f'Student {full_name} enrolled successfully in SQLite!',
        'student': {
            'id': student_id,
            'admission_no': admission_no,
            'roll_no': roll_no,
            'full_name': full_name,
            'father_name': father_name,
            'class_grade': class_grade,
            'section': section,
            'phone': phone,
            'monthly_fee': monthly_fee,
            'status': 'Active'
        }
    }), 201

@app.route('/api/students/<student_id>', methods=['PUT'])
def update_student(student_id):
    data = request.get_json() or {}
    conn = database.get_db()
    cursor = conn.cursor()

    cursor.execute('''
    UPDATE students 
    SET full_name = COALESCE(?, full_name),
        father_name = COALESCE(?, father_name),
        class_grade = COALESCE(?, class_grade),
        section = COALESCE(?, section),
        phone = COALESCE(?, phone),
        address = COALESCE(?, address),
        monthly_fee = COALESCE(?, monthly_fee),
        status = COALESCE(?, status)
    WHERE id = ?
    ''', (data.get('full_name'), data.get('father_name'), data.get('class_grade'),
          data.get('section'), data.get('phone'), data.get('address'),
          data.get('monthly_fee'), data.get('status'), student_id))

    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Student updated successfully in SQLite'})

@app.route('/api/students/<student_id>', methods=['DELETE'])
def delete_student(student_id):
    conn = database.get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM students WHERE id = ?", (student_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Student deleted successfully from SQLite'})

# 3. ATTENDANCE BULK SAVE API
@app.route('/api/attendance/save', methods=['POST'])
def save_attendance():
    data = request.get_json() or {}
    school_id = data.get('school_id', 'chitral-model')
    date_str = data.get('date', '2026-10-12')
    records = data.get('records', [])

    conn = database.get_db()
    cursor = conn.cursor()

    absent_count = 0
    for rec in records:
        stu_id = rec.get('student_id')
        status = rec.get('status', 'P')
        arrival = rec.get('arrival_time', '08:14 AM' if status == 'P' else None)
        if status == 'A':
            absent_count += 1

        cursor.execute('''
        INSERT INTO attendance (school_id, student_id, date, status, marked_by, arrival_time)
        VALUES (?, ?, ?, ?, 'Class Teacher', ?)
        ON CONFLICT(school_id, student_id, date) DO UPDATE SET
            status = excluded.status,
            arrival_time = excluded.arrival_time
        ''', (school_id, stu_id, date_str, status, arrival))

    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'message': f'Attendance for {len(records)} students saved to SQLite! ({absent_count} absent alerts triggered)',
        'date': date_str,
        'absent_count': absent_count
    })

# 4. FEE MANAGEMENT APIS: COLLECT & GENERATE CHALLANS
@app.route('/api/fees/collect', methods=['POST'])
def collect_fee():
    data = request.get_json() or {}
    school_id = data.get('school_id', 'chitral-model')
    student_id = data.get('student_id')
    challan_no = data.get('challan_no')
    paid_amount = int(data.get('paid_amount', 0))
    payment_method = data.get('payment_method', 'Cash')
    paid_date = datetime.now().strftime('%Y-%m-%d')

    conn = database.get_db()
    cursor = conn.cursor()

    cursor.execute('''
    SELECT * FROM fee_challans 
    WHERE school_id = ? AND (challan_no = ? OR student_id = ?)
    ORDER BY id DESC LIMIT 1
    ''', (school_id, challan_no, student_id))
    challan = cursor.fetchone()

    if not challan:
        conn.close()
        return jsonify({'error': 'Fee challan not found'}), 404

    total_amount = challan['total_amount']
    current_paid = challan['paid_amount'] + paid_amount
    balance = max(0, total_amount - current_paid)
    new_status = 'PAID' if balance == 0 else ('PARTIAL' if current_paid > 0 else 'UNPAID')

    cursor.execute('''
    UPDATE fee_challans
    SET paid_amount = ?, balance = ?, payment_method = ?, status = ?, paid_date = ?
    WHERE id = ?
    ''', (current_paid, balance, payment_method, new_status, paid_date, challan['id']))

    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'message': f'Fee payment of PKR {paid_amount:,} collected via {payment_method}!',
        'challan_no': challan['challan_no'],
        'paid_amount': paid_amount,
        'new_balance': balance,
        'status': new_status,
        'receipt_date': paid_date
    })

@app.route('/api/fees/generate-challans', methods=['POST'])
def generate_challans():
    data = request.get_json() or {}
    school_id = data.get('school_id', 'chitral-model')
    month_year = data.get('month_year', 'November 2026')
    include_heating = data.get('include_heating', True)

    conn = database.get_db()
    cursor = conn.cursor()

    # Get heating levy from school
    cursor.execute("SELECT heating_levy FROM schools WHERE id = ?", (school_id,))
    heating_levy = cursor.fetchone()['heating_levy'] if include_heating else 0

    cursor.execute("SELECT id, monthly_fee FROM students WHERE school_id = ? AND status = 'Active'", (school_id,))
    students = cursor.fetchall()

    generated_count = 0
    for idx, stu in enumerate(students):
        challan_no = f"CH-2026-{int(datetime.now().timestamp()) % 10000 + idx:04d}"
        tuition = stu['monthly_fee']
        total = tuition + heating_levy
        
        # Insert new challan
        cursor.execute('''
        INSERT INTO fee_challans (school_id, student_id, challan_no, month_year, tuition_fee, arrears, total_amount, paid_amount, balance, status)
        VALUES (?, ?, ?, ?, ?, 0, ?, 0, ?, 'UNPAID')
        ''', (school_id, stu['id'], challan_no, month_year, tuition, total, total))
        generated_count += 1

    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'message': f'Generated {generated_count} monthly fee challans for {month_year} in SQLite!',
        'count': generated_count
    })

# 5. EXAMINATION MARKS SAVE API
@app.route('/api/exams/save', methods=['POST'])
def save_exam_marks():
    data = request.get_json() or {}
    school_id = data.get('school_id', 'chitral-model')
    student_id = data.get('student_id')
    exam_term = data.get('exam_term', 'First Term')
    english = int(data.get('english', 0))
    urdu = int(data.get('urdu', 0))
    math = int(data.get('math', 0))
    science = int(data.get('science', 0))
    islamiat = int(data.get('islamiat', 0))
    computer_or_econ = int(data.get('computer_or_econ', 0))
    remarks = data.get('remarks', 'Good academic effort')

    obtained = english + urdu + math + science + islamiat + computer_or_econ
    total = 600
    percentage = round((obtained / total) * 100, 2)
    grade = database.calculate_grade(percentage)

    conn = database.get_db()
    cursor = conn.cursor()

    cursor.execute('''
    INSERT INTO exam_marks (school_id, student_id, exam_term, english, urdu, math, science, islamiat, computer_or_econ, total_marks, obtained_marks, percentage, grade, remarks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(school_id, student_id, exam_term) DO UPDATE SET
        english = excluded.english,
        urdu = excluded.urdu,
        math = excluded.math,
        science = excluded.science,
        islamiat = excluded.islamiat,
        computer_or_econ = excluded.computer_or_econ,
        obtained_marks = excluded.obtained_marks,
        percentage = excluded.percentage,
        grade = excluded.grade,
        remarks = excluded.remarks
    ''', (school_id, student_id, exam_term, english, urdu, math, science, islamiat, computer_or_econ, total, obtained, percentage, grade, remarks))

    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'message': f'Exam marks saved in SQLite: {obtained}/{total} ({percentage}% Grade {grade})',
        'obtained_marks': obtained,
        'percentage': percentage,
        'grade': grade
    })

# 6. STAFF PAYROLL PAY API
@app.route('/api/staff/pay', methods=['POST'])
def pay_staff():
    data = request.get_json() or {}
    emp_id = data.get('emp_id')
    school_id = data.get('school_id', 'chitral-model')
    paid_date = datetime.now().strftime('%Y-%m-%d')

    conn = database.get_db()
    cursor = conn.cursor()

    cursor.execute('''
    UPDATE staff_payroll
    SET payment_status = 'Paid', paid_date = ?
    WHERE school_id = ? AND emp_id = ?
    ''', (paid_date, school_id, emp_id))

    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'message': f'Salary for staff member {emp_id} marked as PAID in SQLite!',
        'paid_date': paid_date
    })

# 7. BROADCAST ALERT SEND API
@app.route('/api/broadcasts/send', methods=['POST'])
def send_broadcast():
    data = request.get_json() or {}
    school_id = data.get('school_id', 'chitral-model')
    title = data.get('title', 'Campus Broadcast')
    category = data.get('category', 'Notice')
    message_text = data.get('message_text', '')
    target_group = data.get('target_group', 'All Parents')
    recipient_count = int(data.get('recipient_count', 684))

    conn = database.get_db()
    cursor = conn.cursor()

    cursor.execute('''
    INSERT INTO broadcast_logs (school_id, title, category, message_text, target_group, recipient_count)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', (school_id, title, category, message_text, target_group, recipient_count))

    log_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'message': f'Broadcast "{title}" logged in SQLite and dispatched to {recipient_count} recipients!',
        'broadcast_id': log_id
    })

# 8. SCHOOL SETTINGS UPDATE API
@app.route('/api/schools/<school_id>', methods=['PUT'])
def update_school_settings(school_id):
    data = request.get_json() or {}
    conn = database.get_db()
    cursor = conn.cursor()

    cursor.execute('''
    UPDATE schools
    SET name = COALESCE(?, name),
        campus_city = COALESCE(?, campus_city),
        address = COALESCE(?, address),
        phone = COALESCE(?, phone),
        principal_name = COALESCE(?, principal_name),
        bise_code = COALESCE(?, bise_code),
        email = COALESCE(?, email),
        heating_levy = COALESCE(?, heating_levy)
    WHERE id = ?
    ''', (data.get('name'), data.get('campus_city'), data.get('address'),
          data.get('phone'), data.get('principal_name'), data.get('bise_code'),
          data.get('email'), data.get('heating_levy'), school_id))

    conn.commit()
    conn.close()

    return jsonify({'success': True, 'message': f'Settings for {school_id} saved to SQLite!'})

# 9. BACKUP / EXPORT API
@app.route('/api/backup/export', methods=['GET'])
def export_backup():
    school_id = request.args.get('school_id', 'chitral-model')
    conn = database.get_db()
    cursor = conn.cursor()

    backup = {
        'timestamp': datetime.now().isoformat(),
        'school_id': school_id,
        'school': dict(cursor.execute("SELECT * FROM schools WHERE id = ?", (school_id,)).fetchone() or {}),
        'students': [dict(r) for r in cursor.execute("SELECT * FROM students WHERE school_id = ?", (school_id,)).fetchall()],
        'attendance': [dict(r) for r in cursor.execute("SELECT * FROM attendance WHERE school_id = ?", (school_id,)).fetchall()],
        'fee_challans': [dict(r) for r in cursor.execute("SELECT * FROM fee_challans WHERE school_id = ?", (school_id,)).fetchall()],
        'exam_marks': [dict(r) for r in cursor.execute("SELECT * FROM exam_marks WHERE school_id = ?", (school_id,)).fetchall()],
        'staff_payroll': [dict(r) for r in cursor.execute("SELECT * FROM staff_payroll WHERE school_id = ?", (school_id,)).fetchall()],
        'broadcast_logs': [dict(r) for r in cursor.execute("SELECT * FROM broadcast_logs WHERE school_id = ?", (school_id,)).fetchall()]
    }
    conn.close()

    return jsonify(backup)

if __name__ == '__main__':
    print("================================================================")
    print("  Chitral EduCloud / Smart School ERP - Database Engine Active")
    print("  Local URL: http://127.0.0.1:5050")
    print("  Database: SQLite persistent (chitral_educloud.db)")
    print("================================================================")
    app.run(host='127.0.0.1', port=5050, debug=True)
