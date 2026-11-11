from flask import Blueprint, request, jsonify
import database

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

@attendance_bp.route('/by-date', methods=['GET'])
def get_attendance_by_date():
    school_id = request.args.get('school_id', 'chitral-model')
    date_str = request.args.get('date', '2026-10-12')

    conn = database.get_db()
    cursor = conn.cursor()

    cursor.execute('''
    SELECT a.*, s.full_name as student_name, s.roll_no, s.class_grade, s.section
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    WHERE a.school_id = ? AND a.date = ?
    ORDER BY CAST(s.roll_no AS INTEGER) ASC
    ''', (school_id, date_str))
    records = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return jsonify({
        'date': date_str,
        'school_id': school_id,
        'records': records,
        'count': len(records)
    })
