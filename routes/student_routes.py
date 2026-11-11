from datetime import datetime
from flask import Blueprint, request, jsonify
import database
from utils.exports import generate_students_csv, create_csv_response

student_bp = Blueprint('students', __name__, url_prefix='/api/students')

@student_bp.route('', methods=['POST'])
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

@student_bp.route('/<student_id>', methods=['PUT'])
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

@student_bp.route('/<student_id>', methods=['DELETE'])
def delete_student(student_id):
    conn = database.get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM students WHERE id = ?", (student_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Student deleted successfully from SQLite'})

@student_bp.route('/export/csv', methods=['GET'])
def export_students():
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
