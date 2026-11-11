from datetime import datetime
from flask import Blueprint, request, jsonify
import database
from utils.auth import role_required

finance_bp = Blueprint('finance', __name__)

@finance_bp.route('/api/fees/collect', methods=['POST'])
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

@finance_bp.route('/api/fees/generate-challans', methods=['POST'])
def generate_challans():
    data = request.get_json() or {}
    school_id = data.get('school_id', 'chitral-model')
    month_year = data.get('month_year', 'November 2026')
    include_heating = data.get('include_heating', True)

    conn = database.get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT heating_levy FROM schools WHERE id = ?", (school_id,))
    heating_levy = cursor.fetchone()['heating_levy'] if include_heating else 0

    cursor.execute("SELECT id, monthly_fee FROM students WHERE school_id = ? AND status = 'Active'", (school_id,))
    students = cursor.fetchall()

    generated_count = 0
    for idx, stu in enumerate(students):
        challan_no = f"CH-2026-{int(datetime.now().timestamp()) % 10000 + idx:04d}"
        tuition = stu['monthly_fee']
        total = tuition + heating_levy
        
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

@finance_bp.route('/api/staff/pay', methods=['POST'])
@role_required(['admin'])
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
