from flask import Blueprint, request, jsonify, session
from werkzeug.security import check_password_hash
import database
from utils.auth import login_user_session, logout_user_session, get_current_user_session

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    school_id = data.get('school_id')

    if not username or not password:
        return jsonify({'error': 'Bad Request', 'message': 'Username and password are required.'}), 400

    conn = database.get_db()
    cursor = conn.cursor()

    if school_id:
        cursor.execute("SELECT * FROM users WHERE username = ? AND school_id = ?", (username, school_id))
        user_row = cursor.fetchone()
        if not user_row:
            cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
            user_row = cursor.fetchone()
    else:
        cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
        user_row = cursor.fetchone()
    conn.close()

    if not user_row or not check_password_hash(user_row['password_hash'], password):
        return jsonify({'error': 'Unauthorized', 'message': 'Invalid username or password.'}), 401

    user = dict(user_row)
    login_user_session(user)

    return jsonify({
        'success': True,
        'message': f"Welcome back, {user['full_name']}!",
        'user': {
            'id': user['id'],
            'username': user['username'],
            'role': user['role'],
            'full_name': user['full_name'],
            'school_id': user['school_id'],
            'linked_student_id': user.get('linked_student_id')
        }
    })

@auth_bp.route('/session', methods=['GET'])
@auth_bp.route('/me', methods=['GET'])
def get_session():
    user = get_current_user_session()
    if not user:
        return jsonify({'authenticated': False, 'user': None})
    return jsonify({'authenticated': True, 'user': user})

@auth_bp.route('/logout', methods=['POST'])
def logout():
    logout_user_session()
    session['explicit_logout'] = True
    return jsonify({'success': True, 'message': 'Logged out successfully.'})

@auth_bp.route('/switch-role', methods=['POST'])
@auth_bp.route('/demo-login', methods=['POST'])
def switch_role():
    data = request.get_json() or {}
    role = data.get('role', 'admin').lower()
    school_id = data.get('school_id', 'chitral-model')

    conn = database.get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE school_id = ? AND role = ? LIMIT 1", (school_id, role))
    user_row = cursor.fetchone()

    if not user_row:
        cursor.execute("SELECT * FROM users WHERE role = ? LIMIT 1", (role,))
        user_row = cursor.fetchone()

    conn.close()

    if not user_row:
        return jsonify({'error': 'User not found for role'}), 404

    user = dict(user_row)
    login_user_session(user)

    return jsonify({
        'success': True,
        'message': f"Switched role to {role.upper()}: {user['full_name']}",
        'user': {
            'id': user['id'],
            'username': user['username'],
            'role': user['role'],
            'full_name': user['full_name'],
            'school_id': user['school_id'],
            'linked_student_id': user.get('linked_student_id')
        }
    })
