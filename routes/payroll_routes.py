from datetime import datetime
from flask import Blueprint, request, jsonify
import database

payroll_bp = Blueprint('payroll', __name__, url_prefix='/api/staff')

@payroll_bp.route('/pay', methods=['POST'])
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
