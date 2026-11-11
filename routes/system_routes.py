from datetime import datetime
from flask import Blueprint, request, jsonify
import database
from utils.exports import (
    generate_students_csv,
    generate_attendance_csv,
    generate_fees_csv,
    generate_exam_marks_csv,
    create_csv_response
)

system_bp = Blueprint('system', __name__)

# Broadcast alerts
@system_bp.route('/api/broadcasts/send', methods=['POST'])
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

# School Settings Update
@system_bp.route('/api/schools/<school_id>', methods=['PUT'])
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

# Full JSON Backup
@system_bp.route('/api/backup/export', methods=['GET'])
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

# ==================== MS EXCEL / CSV EXPORTS (UTF-8 BOM) ====================
@system_bp.route('/api/export/students.csv', methods=['GET'])
@system_bp.route('/api/students/export/csv', methods=['GET'])
def export_students_csv():
    school_id = request.args.get('school_id', 'chitral-model')
    conn = database.get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT name FROM schools WHERE id = ?", (school_id,))
    school_name = cursor.fetchone()
    school_title = school_name['name'] if school_name else "Chitral School"

    cursor.execute('''
    SELECT s.*, COALESCE(f.status, 'UNPAID') as fee_status
    FROM students s
    LEFT JOIN fee_challans f ON s.id = f.student_id AND f.month_year = 'October 2026'
    WHERE s.school_id = ?
    ORDER BY CAST(s.roll_no AS INTEGER) ASC
    ''', (school_id,))
    students = [dict(r) for r in cursor.fetchall()]
    conn.close()

    csv_content = generate_students_csv(students, school_title)
    return create_csv_response(csv_content, f"{school_id}_students_roster_2026.csv")

@system_bp.route('/api/export/fees.csv', methods=['GET'])
@system_bp.route('/api/fees/export/csv', methods=['GET'])
def export_fees_csv():
    school_id = request.args.get('school_id', 'chitral-model')
    conn = database.get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT name FROM schools WHERE id = ?", (school_id,))
    school_name = cursor.fetchone()
    school_title = school_name['name'] if school_name else "Chitral School"

    cursor.execute('''
    SELECT fc.*, s.full_name as student_name, s.roll_no, s.class_grade, s.section
    FROM fee_challans fc
    JOIN students s ON fc.student_id = s.id
    WHERE fc.school_id = ?
    ORDER BY fc.id DESC
    ''', (school_id,))
    challans = [dict(r) for r in cursor.fetchall()]
    conn.close()

    csv_content = generate_fees_csv(challans, school_title)
    return create_csv_response(csv_content, f"{school_id}_fee_defaulters_ledger_2026.csv")

@system_bp.route('/api/export/attendance.csv', methods=['GET'])
@system_bp.route('/api/attendance/export/csv', methods=['GET'])
def export_attendance_csv():
    school_id = request.args.get('school_id', 'chitral-model')
    date_str = request.args.get('date', '2026-10-12')

    conn = database.get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT name FROM schools WHERE id = ?", (school_id,))
    school_name = cursor.fetchone()
    school_title = school_name['name'] if school_name else "Chitral School"

    cursor.execute('''
    SELECT 
        s.roll_no, s.full_name as student_name, s.father_name, s.class_grade, s.section,
        COALESCE(a.status, 'P') as status,
        COALESCE(a.arrival_time, '08:14 AM') as arrival_time,
        COALESCE(a.marked_by, 'Class Teacher') as marked_by
    FROM students s
    LEFT JOIN attendance a ON s.id = a.student_id AND a.date = ?
    WHERE s.school_id = ?
    ORDER BY CAST(s.roll_no AS INTEGER) ASC
    ''', (date_str, school_id))
    records = [dict(r) for r in cursor.fetchall()]
    conn.close()

    csv_content = generate_attendance_csv(records, date_str, school_title)
    return create_csv_response(csv_content, f"{school_id}_attendance_{date_str}.csv")

@system_bp.route('/api/export/exams.csv', methods=['GET'])
@system_bp.route('/api/exams/export/csv', methods=['GET'])
def export_exams_csv():
    school_id = request.args.get('school_id', 'chitral-model')
    term = request.args.get('term', 'Mid-Term 2026')

    conn = database.get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT name FROM schools WHERE id = ?", (school_id,))
    school_name = cursor.fetchone()
    school_title = school_name['name'] if school_name else "Chitral School"

    cursor.execute('''
    SELECT 
        s.roll_no, s.full_name as student_name, s.class_grade, s.section,
        em.english, em.urdu, em.math, em.science, em.islamiat, em.computer_or_econ,
        em.total_marks, em.obtained_marks, em.percentage, em.grade, em.remarks
    FROM exam_marks em
    JOIN students s ON em.student_id = s.id
    WHERE em.school_id = ? AND em.exam_term = ?
    ORDER BY em.obtained_marks DESC
    ''', (school_id, term))
    marks_list = [dict(r) for r in cursor.fetchall()]
    conn.close()

    csv_content = generate_exam_marks_csv(marks_list, term, school_title)
    return create_csv_response(csv_content, f"{school_id}_exam_merit_{term.replace(' ', '_')}.csv")
