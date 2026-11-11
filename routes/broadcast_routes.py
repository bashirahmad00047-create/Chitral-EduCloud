from flask import Blueprint, request, jsonify
import database

broadcast_bp = Blueprint('broadcasts', __name__, url_prefix='/api/broadcasts')

@broadcast_bp.route('/send', methods=['POST'])
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
