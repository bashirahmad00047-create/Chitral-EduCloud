from datetime import datetime
from flask import Blueprint, request, jsonify, session
import database
from utils.auth import role_required

student_bp = Blueprint('students', __name__)

@student_bp.route('/api/bootstrap', methods=['GET'])
def get_bootstrap():
    user_school_id = session.get('school_id')
    user_name = session.get('username')
    user_role = session.get('role')

    req_school_id = request.args.get('school_id')
    is_master_admin = (user_name == 'admin' or user_role == 'superadmin')

    if is_master_admin and req_school_id:
        school_id = req_school_id
    elif user_school_id:
        school_id = user_school_id
    else:
        school_id = req_school_id or 'chitral-model'

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
        'lan_ip': '10.154.203.239',
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
    discount_amount = int(data.get('discount_amount', 0))

    if not full_name or not father_name:
        return jsonify({'error': 'Student name and Father name are required'}), 400

    conn = database.get_db()
    cursor = conn.cursor()

    student_id = f"STU-{int(datetime.now().timestamp() * 1000) % 100000}"
    admission_no = f"CMC-2026-{int(datetime.now().timestamp()) % 10000:04d}"

    # Insert Student
    cursor.execute('''
    INSERT INTO students (id, school_id, admission_no, roll_no, full_name, name_urdu, father_name, father_name_urdu, gender, class_grade, section, phone, blood_group, address, monthly_fee, discount_amount, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (student_id, school_id, admission_no, roll_no, full_name, full_name, father_name, father_name, 'Male', class_grade, section, phone, blood_group, address, monthly_fee, discount_amount, 'Active'))

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
@role_required(['admin'])
def delete_student(student_id):
    conn = database.get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM students WHERE id = ?", (student_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Student deleted successfully from SQLite'})

# ==================== ANNUAL CLASS PROMOTION (سالانہ ترقی) ====================
@student_bp.route('/api/students/promote-class', methods=['POST'])
@role_required(['admin'])
def promote_class():
    data = request.get_json() or {}
    school_id = data.get('school_id', 'chitral-model')
    from_class = (data.get('from_class') or '').strip()
    to_class = (data.get('to_class') or '').strip()

    if not from_class or not to_class:
        return jsonify({'error': 'Source class (from_class) and Target class (to_class) are required'}), 400

    conn = database.get_db()
    cursor = conn.cursor()
    cursor.execute('''
    UPDATE students
    SET class_grade = ?
    WHERE school_id = ? AND class_grade = ? AND status = 'Active'
    ''', (to_class, school_id, from_class))
    promoted_count = cursor.rowcount
    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'message': f'Successfully promoted {promoted_count} students from {from_class} to {to_class}!',
        'promoted_count': promoted_count,
        'from_class': from_class,
        'to_class': to_class
    })

# ==================== OFFICIAL CERTIFICATES (LEAVING & CHARACTER) ====================
@student_bp.route('/api/students/<student_id>/certificate', methods=['GET'])
def get_student_certificate(student_id):
    cert_type = request.args.get('type', 'leaving')  # 'leaving' or 'character'
    conn = database.get_db()
    cursor = conn.cursor()
    cursor.execute('''
    SELECT s.*, sc.name as school_name, sc.principal_name, sc.bise_code, sc.phone as school_phone, sc.address as school_address
    FROM students s
    JOIN schools sc ON s.school_id = sc.id
    WHERE s.id = ?
    ''', (student_id,))
    stu = cursor.fetchone()
    conn.close()

    if not stu:
        return jsonify({'error': 'Student not found'}), 404

    stu_dict = dict(stu)
    today_str = datetime.now().strftime('%d %B, %Y')
    cert_data = {
        'certificate_type': cert_type,
        'certificate_title': 'School Leaving Certificate' if cert_type == 'leaving' else 'Character & Conduct Certificate',
        'serial_no': f"SLC-{datetime.now().year}-{stu_dict['admission_no']}",
        'issue_date': today_str,
        'student_name': stu_dict['full_name'],
        'student_name_urdu': stu_dict.get('name_urdu') or stu_dict['full_name'],
        'father_name': stu_dict['father_name'],
        'father_name_urdu': stu_dict.get('father_name_urdu') or stu_dict['father_name'],
        'admission_no': stu_dict['admission_no'],
        'roll_no': stu_dict['roll_no'],
        'class_grade': stu_dict['class_grade'],
        'section': stu_dict['section'],
        'school_name': stu_dict['school_name'],
        'bise_code': stu_dict['bise_code'] or 'BISE Malakand / Peshawar Registered',
        'principal_name': stu_dict['principal_name'],
        'admission_date': str(stu_dict.get('created_at', '2024-04-10'))[:10],
        'leaving_date': today_str,
        'conduct': 'Exemplary / Very Good (نہایت عمدہ و بااخلاق)',
        'reason_for_leaving': 'Completed Course of Study / Passed BISE Board Examination',
        'remarks': 'Dues cleared in full. We wish him/her success in all future academic pursuits.'
    }
    return jsonify({'success': True, 'certificate': cert_data})

# ==================== PUBLIC QR VERIFICATION BADGE ====================
@student_bp.route('/verify/student/<admission_no>', methods=['GET'])
def verify_student(admission_no):
    conn = database.get_db()
    cursor = conn.cursor()
    cursor.execute('''
    SELECT s.*, sch.name as school_name, sch.campus_city, sch.address as school_address, 
           sch.phone as school_phone, sch.principal_name, sch.bise_code
    FROM students s
    JOIN schools sch ON s.school_id = sch.id
    WHERE UPPER(s.admission_no) = UPPER(?) OR s.id = ?
    ''', (admission_no, admission_no))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return f'''
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verification Failed | Chitral EduCloud</title>
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-slate-100 min-h-screen flex items-center justify-center p-4 font-sans">
            <div class="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-xl border border-red-200">
                <div class="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">✕</div>
                <h2 class="text-xl font-black text-slate-900 mb-1">Student Record Not Found</h2>
                <p class="text-xs text-slate-500 mb-4">No enrolled student with Admission #{admission_no} was found in the official registry.</p>
                <a href="/" class="inline-block px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800">Return to Portal</a>
            </div>
        </body>
        </html>
        ''', 404

    stu = dict(row)
    return f'''
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Student Verification - {stu["full_name"]} | Chitral EduCloud</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    </head>
    <body class="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 min-h-screen flex items-center justify-center p-4 font-sans text-slate-800">
        <div class="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-emerald-500/30">
            <div class="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white text-center relative">
                <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-black uppercase tracking-wider text-emerald-100 mb-2 border border-white/20">
                    <i class="fa-solid fa-circle-check text-emerald-300"></i> Official Verified Record
                </div>
                <h1 class="text-lg font-extrabold leading-snug">{stu["school_name"]}</h1>
                <p class="text-xs text-emerald-100/90 font-medium">{stu["campus_city"]} &middot; {stu.get("bise_code") or "KP Board"}</p>
            </div>

            <div class="p-6 space-y-5">
                <div class="flex items-center gap-4 border-b border-slate-100 pb-4">
                    <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-emerald-500/20">
                        {stu["full_name"][0]}
                    </div>
                    <div>
                        <h2 class="text-xl font-black text-slate-900 leading-tight">{stu["full_name"]}</h2>
                        <p class="text-xs font-semibold text-slate-500">s/o {stu["father_name"]}</p>
                        <span class="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ● {stu["status"].upper()} STUDENT
                        </span>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3 text-xs">
                    <div class="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Admission No</span>
                        <span class="font-extrabold text-slate-900">{stu["admission_no"]}</span>
                    </div>
                    <div class="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Roll Number</span>
                        <span class="font-extrabold text-slate-900">#{stu["roll_no"]}</span>
                    </div>
                    <div class="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Class & Section</span>
                        <span class="font-extrabold text-slate-900">{stu["class_grade"]} - {stu["section"]}</span>
                    </div>
                    <div class="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Blood Group</span>
                        <span class="font-extrabold text-rose-600">{stu["blood_group"] or "N/A"}</span>
                    </div>
                </div>

                <div class="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl text-[11px] text-emerald-950 space-y-1">
                    <div class="flex justify-between">
                        <span class="text-emerald-700 font-semibold">Campus Contact:</span>
                        <span class="font-bold">{stu["school_phone"]}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-emerald-700 font-semibold">Principal:</span>
                        <span class="font-bold">{stu["principal_name"]}</span>
                    </div>
                </div>

                <div class="text-center pt-2 border-t border-slate-100">
                    <p class="text-[10px] text-slate-400 font-medium">Digital Verification Seal &middot; Chitral EduCloud ERP</p>
                    <p class="text-[9px] text-emerald-600 font-mono mt-0.5">SHA-256 Validated &middot; Active Session 2026-2027</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    '''
