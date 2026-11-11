from datetime import datetime
from flask import Blueprint, request, jsonify, session
import database
from utils.auth import role_required

finance_bp = Blueprint('finance', __name__)

def get_tenant_school_id(param_school_id=None):
    user_school = session.get('school_id')
    user_name = session.get('username')
    user_role = session.get('role')
    if (user_name == 'admin' or user_role == 'superadmin') and param_school_id:
        return param_school_id
    if user_school:
        return user_school
    return param_school_id or 'chitral-model'

@finance_bp.route('/api/fees/pending-heads', methods=['GET'])
def get_pending_heads():
    student_id = request.args.get('student_id')
    school_id = get_tenant_school_id(request.args.get('school_id'))
    conn = database.get_db()
    cursor = conn.cursor()

    cursor.execute('''
    SELECT fi.*, fc.challan_no, fc.total_amount as challan_total, fc.balance as challan_balance
    FROM fee_items fi
    JOIN fee_challans fc ON fi.challan_id = fc.id
    WHERE fi.school_id = ? AND fi.student_id = ? AND fi.balance > 0
    ORDER BY fi.id ASC
    ''', (school_id, student_id))
    heads = [dict(r) for r in cursor.fetchall()]

    if not heads:
        cursor.execute('''
        SELECT * FROM fee_challans WHERE school_id = ? AND student_id = ? AND balance > 0
        ORDER BY id DESC LIMIT 1
        ''', (school_id, student_id))
        ch = cursor.fetchone()
        if ch:
            c_id = ch['id']
            tot = ch['balance']
            adm_amt = 2250 if tot >= 4000 else 1000
            tuition_amt = max(0, tot - adm_amt)
            cursor.execute('''
            INSERT INTO fee_items (school_id, challan_id, student_id, head_title, amount, paid_amount, balance, status)
            VALUES (?, ?, ?, 'Admission / Annual Fund', ?, 0, ?, 'UNPAID')
            ''', (school_id, c_id, student_id, adm_amt, adm_amt))
            cursor.execute('''
            INSERT INTO fee_items (school_id, challan_id, student_id, head_title, amount, paid_amount, balance, status)
            VALUES (?, ?, ?, 'Current Month Tuition Fee (Nov 2026)', ?, 0, ?, 'UNPAID')
            ''', (school_id, c_id, student_id, tuition_amt, tuition_amt))
            conn.commit()

            cursor.execute('''
            SELECT fi.*, fc.challan_no, fc.total_amount as challan_total, fc.balance as challan_balance
            FROM fee_items fi
            JOIN fee_challans fc ON fi.challan_id = fc.id
            WHERE fi.school_id = ? AND fi.student_id = ? AND fi.balance > 0
            ORDER BY fi.id ASC
            ''', (school_id, student_id))
            heads = [dict(r) for r in cursor.fetchall()]

    conn.close()
    total_pending = sum(h['balance'] for h in heads)
    return jsonify({'success': True, 'heads': heads, 'total_pending': total_pending})

@finance_bp.route('/api/fees/collect', methods=['POST'])
def collect_fee():
    data = request.get_json() or {}
    school_id = get_tenant_school_id(data.get('school_id'))
    student_id = data.get('student_id')
    challan_no = data.get('challan_no')
    fee_head = data.get('fee_head')
    paid_amount = int(data.get('paid_amount', 0))
    payment_method = data.get('payment_method', 'Cash')
    payment_note = data.get('payment_note') or data.get('remarks') or ''
    paid_date = data.get('payment_date') or datetime.now().strftime('%Y-%m-%d')

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

    # Normalize payment method to respect SQLite CHECK constraint
    pm_raw = str(payment_method).lower()
    if 'jazz' in pm_raw:
        clean_pm = 'JazzCash'
    elif 'easy' in pm_raw:
        clean_pm = 'EasyPaisa'
    elif 'khyber' in pm_raw or 'bank' in pm_raw:
        clean_pm = 'Bank of Khyber'
    else:
        clean_pm = 'Cash'

    # Support dynamically recalculated itemized total (tuition + heating + exam - concession)
    if 'total_amount' in data:
        try:
            total_amount = int(data['total_amount'])
        except (ValueError, TypeError):
            total_amount = challan['total_amount']
    else:
        total_amount = challan['total_amount']

    # Update itemized fee_items in SQLite
    if fee_head and fee_head != 'ALL' and 'Combined' not in fee_head:
        clean_head_prefix = fee_head.split('-')[0].strip()
        cursor.execute('''
        SELECT * FROM fee_items 
        WHERE challan_id = ? AND (head_title LIKE ? OR ? LIKE '%' || head_title || '%')
        ORDER BY id ASC LIMIT 1
        ''', (challan['id'], f"%{clean_head_prefix}%", fee_head))
        item = cursor.fetchone()
        if item:
            item_paid = min(item['balance'], paid_amount)
            new_item_bal = max(0, item['balance'] - item_paid)
            new_item_status = 'PAID' if new_item_bal == 0 else 'PARTIAL'
            cursor.execute('''
            UPDATE fee_items 
            SET paid_amount = paid_amount + ?, balance = ?, status = ?
            WHERE id = ?
            ''', (item_paid, new_item_bal, new_item_status, item['id']))
    else:
        # Allocate across all pending items
        rem_alloc = paid_amount
        cursor.execute("SELECT * FROM fee_items WHERE challan_id = ? AND balance > 0 ORDER BY id ASC", (challan['id'],))
        pending_items = cursor.fetchall()
        for it in pending_items:
            if rem_alloc <= 0:
                break
            alloc = min(it['balance'], rem_alloc)
            new_bal = it['balance'] - alloc
            new_st = 'PAID' if new_bal == 0 else 'PARTIAL'
            cursor.execute('''
            UPDATE fee_items SET paid_amount = paid_amount + ?, balance = ?, status = ? WHERE id = ?
            ''', (alloc, new_bal, new_st, it['id']))
            rem_alloc -= alloc

    current_paid = min(total_amount, challan['paid_amount'] + paid_amount)
    balance = max(0, total_amount - current_paid)
    new_status = 'PAID' if balance == 0 else ('PARTIAL' if current_paid > 0 else 'UNPAID')

    cursor.execute('''
    UPDATE fee_challans
    SET total_amount = ?, paid_amount = ?, balance = ?, payment_method = ?, status = ?, paid_date = ?
    WHERE id = ?
    ''', (total_amount, current_paid, balance, clean_pm, new_status, paid_date, challan['id']))

    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'message': f'Fee payment of PKR {paid_amount:,} collected via {clean_pm}!',
        'challan_no': challan['challan_no'],
        'paid_amount': paid_amount,
        'total_amount': total_amount,
        'new_balance': balance,
        'status': new_status,
        'receipt_date': paid_date,
        'payment_method': clean_pm,
        'payment_note': payment_note,
        'fee_head': fee_head or 'All Pending Dues'
    })

@finance_bp.route('/api/fees/generate-challans', methods=['POST'])
def generate_challans():
    data = request.get_json() or {}
    school_id = get_tenant_school_id(data.get('school_id'))
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
    school_id = get_tenant_school_id(data.get('school_id'))
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

# ==================== DAILY EXPENSE & CASHBOOK (روزنامچہ آمدن و اخراجات) ====================

@finance_bp.route('/api/expenses', methods=['GET'])
def get_expenses():
    school_id = get_tenant_school_id(request.args.get('school_id'))
    conn = database.get_db()
    cursor = conn.cursor()
    cursor.execute('''
    SELECT * FROM expenses
    WHERE school_id = ?
    ORDER BY expense_date DESC, id DESC
    ''', (school_id,))
    expenses = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({'success': True, 'expenses': expenses, 'count': len(expenses)})

@finance_bp.route('/api/expenses/add', methods=['POST'])
@role_required(['admin'])
def add_expense():
    data = request.get_json() or {}
    school_id = get_tenant_school_id(data.get('school_id'))
    category = (data.get('category') or 'General Expense').strip()
    title = (data.get('title') or '').strip()
    try:
        amount = int(data.get('amount', 0))
    except (ValueError, TypeError):
        amount = 0

    if not title or amount <= 0:
        return jsonify({'error': 'Valid expense title and amount (PKR) are required'}), 400

    paid_to = (data.get('paid_to') or '').strip()
    expense_date = data.get('expense_date') or datetime.now().strftime('%Y-%m-%d')
    receipt_no = data.get('receipt_no') or f"EXP-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    payment_mode = data.get('payment_mode') or 'Cash'
    notes = data.get('notes') or ''

    conn = database.get_db()
    cursor = conn.cursor()
    cursor.execute('''
    INSERT INTO expenses (school_id, category, title, amount, paid_to, expense_date, receipt_no, payment_mode, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (school_id, category, title, amount, paid_to, expense_date, receipt_no, payment_mode, notes))
    exp_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'message': f'Expense of PKR {amount:,} recorded in Daily Cashbook (روزنامچہ)!',
        'expense_id': exp_id,
        'receipt_no': receipt_no
    })

@finance_bp.route('/api/expenses/cashbook-summary', methods=['GET'])
def get_cashbook_summary():
    school_id = get_tenant_school_id(request.args.get('school_id'))
    conn = database.get_db()
    cursor = conn.cursor()

    # 1. Total fee income collected
    cursor.execute('''
    SELECT COALESCE(SUM(paid_amount), 0) as total_income
    FROM fee_challans
    WHERE school_id = ?
    ''', (school_id,))
    total_income = cursor.fetchone()['total_income']

    # 2. Total expenses
    cursor.execute('''
    SELECT COALESCE(SUM(amount), 0) as total_expense
    FROM expenses
    WHERE school_id = ?
    ''', (school_id,))
    total_expense = cursor.fetchone()['total_expense']

    # 3. Net cash in hand
    net_cash = total_income - total_expense

    # 4. Expenses by category
    cursor.execute('''
    SELECT category, SUM(amount) as cat_total, COUNT(*) as count
    FROM expenses
    WHERE school_id = ?
    GROUP BY category
    ORDER BY cat_total DESC
    ''', (school_id,))
    by_category = [dict(r) for r in cursor.fetchall()]

    # 5. Recent 10 expenses
    cursor.execute('''
    SELECT * FROM expenses
    WHERE school_id = ?
    ORDER BY expense_date DESC, id DESC
    LIMIT 10
    ''', (school_id,))
    recent_expenses = [dict(r) for r in cursor.fetchall()]

    conn.close()

    return jsonify({
        'success': True,
        'school_id': school_id,
        'total_income': total_income,
        'total_expense': total_expense,
        'net_cash': net_cash,
        'by_category': by_category,
        'recent_expenses': recent_expenses
    })

