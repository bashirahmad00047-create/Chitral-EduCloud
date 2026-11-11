from datetime import datetime
from flask import Blueprint, request, jsonify
import database

student_bp = Blueprint('students', __name__)

@student_bp.route('/api/bootstrap', methods=['GET'])
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

@student_bp.route('/api/students', methods=['GET'])
def get_students():
    school_id = request.args.get('school_id', 'chitral-model')
    conn = database.get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM students WHERE school_id = ? ORDER BY CAST(roll_no AS INTEGER) ASC", (school_id,))
    students = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({'students': students, 'count': len(students)})

@student_bp.route('/api/students', methods=['POST'])
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

@student_bp.route('/api/students/<student_id>', methods=['PUT'])
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

@student_bp.route('/api/students/<student_id>', methods=['DELETE'])
def delete_student(student_id):
    conn = database.get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM students WHERE id = ?", (student_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Student deleted successfully from SQLite'})
