from flask import Blueprint, request, jsonify
import database

exam_bp = Blueprint('exams', __name__, url_prefix='/api/exams')

@exam_bp.route('/save', methods=['POST'])
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
