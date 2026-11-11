from routes.auth_routes import auth_bp
from routes.student_routes import student_bp
from routes.attendance_routes import attendance_bp
from routes.finance_routes import finance_bp
from routes.exam_routes import exam_bp
from routes.system_routes import system_bp

def register_blueprints(app):
    """Register all modular application blueprints."""
    app.register_blueprint(auth_bp)
    app.register_blueprint(student_bp)
    app.register_blueprint(attendance_bp)
    app.register_blueprint(finance_bp)
    app.register_blueprint(exam_bp)
    app.register_blueprint(system_bp)
