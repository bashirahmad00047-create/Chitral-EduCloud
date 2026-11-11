from flask import Flask, render_template, jsonify
from config import Config
import database
from routes import register_blueprints

app = Flask(__name__)
app.config.from_object(Config)

# Initialize SQLite database on startup
database.init_db()

# Register all modular blueprints
register_blueprints(app)

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
    print("  Architecture: Modular Blueprints (Auth, SIS, Attendance, Fees, Exams, System)")
    print("  Database: SQLite persistent (chitral_educloud.db)")
    print("================================================================")
    app.run(host='127.0.0.1', port=5050, debug=True)
