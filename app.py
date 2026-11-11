import os
import json
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)
app.config['SECRET_KEY'] = 'chitral-educloud-enterprise-secret-key-2026'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'application': 'Chitral EduCloud / Smart School ERP',
        'version': '1.0.0',
        'academic_session': '2026-2027',
        'region': 'Chitral, Khyber Pakhtunkhwa, Pakistan'
    })

if __name__ == '__main__':
    print("================================================================")
    print("  Chitral EduCloud / Smart School ERP - Server Starting")
    print("  Local URL: http://127.0.0.1:5050")
    print("  Dedicated Port: 5050 (Safe from default port 5000 conflicts)")
    print("================================================================")
    app.run(host='127.0.0.1', port=5050, debug=True)
