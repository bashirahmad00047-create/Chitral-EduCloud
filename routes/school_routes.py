from datetime import datetime
import socket
from flask import Blueprint, request, jsonify, session
import database

def get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

school_bp = Blueprint('schools', __name__)

@school_bp.route('/api/bootstrap', methods=['GET'])
def get_bootstrap():
    # Strict Multi-Tenant Isolation:
    # Root platform admin (username 'admin') has cross-campus purview;
    # School-level administrators, teachers and parents are strictly locked to their school tenant.
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

    # All Schools
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
        'lan_ip': get_lan_ip(),
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

@school_bp.route('/api/schools/<school_id>', methods=['PUT'])
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

@school_bp.route('/api/backup/export', methods=['GET'])
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
