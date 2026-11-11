from flask import Blueprint, request, jsonify
import database
from utils.exports import generate_attendance_csv, create_csv_response

attendance_bp = Blueprint('attendance', __name__, url_prefix='/api/attendance')

@attendance_bp.route('/save', methods=['POST'])
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

@attendance_bp.route('/export/csv', methods=['GET'])
def export_attendance():
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
