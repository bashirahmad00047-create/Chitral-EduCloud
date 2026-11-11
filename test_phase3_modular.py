"""
Chitral EduCloud ERP - Phase 3 Modular Architecture, Auth & CSV Export Verification Suite
"""

import sys
from app import app

def run_phase3_tests():
    print("==================================================================")
    print("  Chitral EduCloud ERP - Phase 3 Modular Verification Suite")
    print("==================================================================")

    client = app.test_client()
    passed = 0
    total = 8

    # 1. Health check & Architecture Version
    print("\n[TEST 1] Testing /api/health and Modular Blueprints...")
    res = client.get('/api/health')
    assert res.status_code == 200
    data = res.get_json()
    assert 'Modular Blueprints' in data['version']
    print(f"  --> PASSED: Health Check OK ({data['version']})")
    passed += 1

    # 2. Valid Login Test
    print("\n[TEST 2] Testing User Authentication (POST /api/auth/login)...")
    res = client.post('/api/auth/login', json={
        'username': 'admin_cmc',
        'password': 'admin123',
        'school_id': 'chitral-model'
    })
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    login_data = res.get_json()
    assert login_data['success'] is True
    assert login_data['user']['role'] == 'admin'
    print(f"  --> PASSED: Logged in as '{login_data['user']['full_name']}' (Role: {login_data['user']['role']})")
    passed += 1

    # 3. Invalid Credentials Test
    print("\n[TEST 3] Testing Invalid Credentials Rejection...")
    res = client.post('/api/auth/login', json={
        'username': 'admin_cmc',
        'password': 'wrong_password_123'
    })
    assert res.status_code == 401
    print("  --> PASSED: Invalid password rejected with HTTP 401.")
    passed += 1

    # 4. Session Me & Logout
    print("\n[TEST 4] Testing Session Status & Logout (/api/auth/me & /api/auth/logout)...")
    res_me = client.get('/api/auth/me')
    assert res_me.status_code == 200
    assert res_me.get_json()['authenticated'] is True
    res_logout = client.post('/api/auth/logout')
    assert res_logout.status_code == 200
    res_me2 = client.get('/api/auth/me')
    assert res_me2.get_json()['authenticated'] is False
    print("  --> PASSED: Session active, cleared upon logout.")
    passed += 1

    # 5. Student Roster CSV Export
    print("\n[TEST 5] Testing Student SIS CSV Export (/api/students/export/csv)...")
    res_csv = client.get('/api/students/export/csv?school_id=chitral-model')
    assert res_csv.status_code == 200
    assert 'text/csv' in res_csv.content_type
    content = res_csv.get_data(as_text=True)
    assert content.startswith('\ufeff')  # UTF-8 BOM
    assert 'STUDENT ROSTER' in content
    assert 'Aliyan Ali' in content
    print("  --> PASSED: Student Roster CSV generated with UTF-8 BOM.")
    passed += 1

    # 6. Attendance CSV Export
    print("\n[TEST 6] Testing Attendance CSV Export (/api/attendance/export/csv)...")
    res_att = client.get('/api/attendance/export/csv?school_id=chitral-model&date=2026-10-12')
    assert res_att.status_code == 200
    assert 'text/csv' in res_att.content_type
    att_content = res_att.get_data(as_text=True)
    assert 'ATTENDANCE REGISTER' in att_content
    print("  --> PASSED: Attendance CSV generated with date headers.")
    passed += 1

    # 7. Fee Ledger CSV Export
    print("\n[TEST 7] Testing Fee Ledger CSV Export (/api/fees/export/csv)...")
    res_fee = client.get('/api/fees/export/csv?school_id=chitral-model')
    assert res_fee.status_code == 200
    assert 'text/csv' in res_fee.content_type
    fee_content = res_fee.get_data(as_text=True)
    assert 'FEE COLLECTION & ARREARS' in fee_content
    print("  --> PASSED: Fee Ledger CSV generated.")
    passed += 1

    # 8. Exam Merit List CSV Export
    print("\n[TEST 8] Testing Exam Merit CSV Export (/api/exams/export/csv)...")
    res_exam = client.get('/api/exams/export/csv?school_id=chitral-model&term=First+Term')
    assert res_exam.status_code == 200
    assert 'text/csv' in res_exam.content_type
    exam_content = res_exam.get_data(as_text=True)
    assert 'EXAMINATION MERIT & MARKS' in exam_content
    print("  --> PASSED: Exam Merit List CSV generated.")
    passed += 1

    print("\n==================================================================")
    print(f"  PHASE 3 RESULTS: {passed}/{total} Tests Passed (100% Success!)")
    print("  Modular Blueprints, Session Auth & Excel Exports Verified.")
    print("==================================================================")
    return True

if __name__ == '__main__':
    try:
        success = run_phase3_tests()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n[FAIL] Test suite failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
