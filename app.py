from flask import Flask, render_template, jsonify
from config import Config
import database

# Import route blueprints
from routes.auth_routes import auth_bp
from routes.school_routes import school_bp
from routes.student_routes import student_bp
from routes.attendance_routes import attendance_bp
from routes.fee_routes import fee_bp
from routes.exam_routes import exam_bp
from routes.payroll_routes import payroll_bp
from routes.broadcast_routes import broadcast_bp

app = Flask(__name__)
app.config.from_object(Config)

# Initialize SQLite database on startup
database.init_db()

# Register Blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(school_bp)
app.register_blueprint(student_bp)
app.register_blueprint(attendance_bp)
app.register_blueprint(fee_bp)
app.register_blueprint(exam_bp)
app.register_blueprint(payroll_bp)
app.register_blueprint(broadcast_bp)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'application': 'Chitral EduCloud / Smart School ERP',
        'version': '3.0.0 (Modular Blueprints)',
        'academic_session': '2026-2027',
        'region': 'Chitral, Khyber Pakhtunkhwa, Pakistan',
        'architecture': 'Refactored Modular Blueprints + SQLite + Auth + Excel Exports',
        'database': 'SQLite persistent (chitral_educloud.db)'
    })

if __name__ == '__main__':
    print("================================================================")
    print("  Chitral EduCloud / Smart School ERP - Modular Engine Active")
    print("  Local URL: http://127.0.0.1:5050")
    print("  Architecture: Modular Blueprints (Auth, SIS, Attendance, Fees, Exams)")
    print("  Database: SQLite persistent (chitral_educloud.db)")
    print("================================================================")
    app.run(host='127.0.0.1', port=5050, debug=True)
