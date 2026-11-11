import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'chitral_educloud.db')

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'chitral-educloud-enterprise-secret-key-2026')
    DATABASE_PATH = DB_PATH
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    JSON_SORT_KEYS = False
    WHATSAPP_ENGINE_URL = os.environ.get('WHATSAPP_ENGINE_URL', 'http://127.0.0.1:5055')
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
