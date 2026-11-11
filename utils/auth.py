from functools import wraps
from flask import session, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

def login_user_session(user):
    session['user_id'] = user['id']
    session['username'] = user['username']
    session['role'] = user['role']
    session['full_name'] = user['full_name']
    session['school_id'] = user['school_id']
    session['linked_student_id'] = user.get('linked_student_id')
    session.permanent = True

def logout_user_session():
    session.clear()

def get_current_user_session():
    if 'user_id' not in session:
        return None
    return {
        'id': session.get('user_id'),
        'username': session.get('username'),
        'role': session.get('role'),
        'full_name': session.get('full_name'),
        'school_id': session.get('school_id'),
        'linked_student_id': session.get('linked_student_id')
    }

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized', 'message': 'Authentication required. Please log in.'}), 401
        return f(*args, **kwargs)
    return decorated_function

def role_required(*allowed_roles):
    flat_roles = []
    for r in allowed_roles:
        if isinstance(r, (list, tuple)):
            flat_roles.extend(r)
        else:
            flat_roles.append(r)

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            current_role = session.get('role')
            if current_role and current_role not in flat_roles:
                return jsonify({'error': 'Forbidden', 'message': f'Access restricted. Required role: {", ".join(flat_roles)}'}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator
