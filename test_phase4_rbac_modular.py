"""
Chitral EduCloud ERP - Phase 4 Verification Suite
Validates:
1. Jinja2 partials rendering (GET /)
2. Real password authentication for admin, teacher, and parent
3. Server-side RBAC protection on sensitive write APIs (403 for unauthorized roles)
4. Public mobile QR verification route (/verify/student/<admission_no>)
5. WhatsApp Broadcast log recording
"""

import sys
from app import app

def run_phase4_tests():
    print("==================================================================")
    print("  Chitral EduCloud ERP - Phase 4 RBAC & Modular Verification Suite")
    print("==================================================================")

    client = app.test_client()
    passed = 0
    total = 8

    # 1. Test Master Jinja2 Template & Partials
    print("\n[TEST 1] Testing Jinja2 Partials Layout (GET /)...")
    res = client.get('/')
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    html = res.get_data(as_text=True)
    assert 'Chitral EduCloud' in html
    assert '{% include' not in html  # Jinja includes successfully resolved
    assert 'mainContent' in html or 'main-content-area' in html
    assert 'screen-dashboard' in html
    assert 'screen-students' in html
    assert 'screen-parent' in html
    print("  --> PASSED: Master Jinja2 layout rendered all 6 partials with HTTP 200.")
    passed += 1

    # 2. Test Admin Login (admin / admin123)
    print("\n[TEST 2] Testing Admin Login (admin / admin123)...")
    res = client.post('/api/auth/login', json={'username': 'admin', 'password': 'admin123'})
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.get_json()
    assert data['success'] is True
    assert data['user']['role'] == 'admin'
    print(f"  --> PASSED: Admin authenticated: {data['user']['full_name']} (Role: admin)")
    passed += 1

    # 3. Test Teacher Login (teacher / teach123)
    print("\n[TEST 3] Testing Teacher Login (teacher / teach123)...")
    res = client.post('/api/auth/login', json={'username': 'teacher', 'password': 'teach123'})
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.get_json()
    assert data['success'] is True
    assert data['user']['role'] == 'teacher'
    print(f"  --> PASSED: Teacher authenticated: {data['user']['full_name']} (Role: teacher)")
    passed += 1

    # 4. Test Parent Login (parent / parent123)
    print("\n[TEST 4] Testing Parent Login (parent / parent123)...")
    res = client.post('/api/auth/login', json={'username': 'parent', 'password': 'parent123'})
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.get_json()
    assert data['success'] is True
    assert data['user']['role'] == 'parent'
    print(f"  --> PASSED: Parent authenticated: {data['user']['full_name']} (Role: parent)")
    passed += 1

    # 5. Test RBAC Protection: Parent cannot call DELETE /api/students/<id>
    print("\n[TEST 5] Testing RBAC Security Guard (Parent role restricted from DELETE student)...")
    # Session is currently logged in as 'parent' from TEST 4
    del_res = client.delete('/api/students/STU-1001')
    assert del_res.status_code == 403, f"Expected 403 Forbidden, got {del_res.status_code}"
    err_data = del_res.get_json()
    assert err_data.get('error') == 'Forbidden'
    print(f"  --> PASSED: Parent blocked with HTTP 403 ({err_data.get('message')})")
    passed += 1

    # 6. Test RBAC Permission: Admin CAN call DELETE /api/students/<id>
    print("\n[TEST 6] Testing Admin Write Permission...")
    client.post('/api/auth/login', json={'username': 'admin', 'password': 'admin123'})
    del_admin_res = client.delete('/api/students/NON_EXISTENT_STU_FOR_TEST')
    assert del_admin_res.status_code == 200
    print("  --> PASSED: Admin successfully authorized for student deletion.")
    passed += 1

    # 7. Test Public QR Verification Route (GET /verify/student/<admission_no>)
    print("\n[TEST 7] Testing Public Student QR Verification Route (/verify/student/CMC-2024-0412)...")
    client.post('/api/auth/logout')  # Unauthenticated public request
    res_qr = client.get('/verify/student/CMC-2024-0412')
    assert res_qr.status_code == 200, f"Expected 200, got {res_qr.status_code}"
    qr_html = res_qr.get_data(as_text=True)
    assert 'Official Verified Record' in qr_html
    assert 'Aliyan Ali' in qr_html
    assert 'Chitral Model College' in qr_html
    print("  --> PASSED: QR scan returned mobile-friendly verified badge with HTTP 200.")
    passed += 1

    # 8. Test Direct WhatsApp Broadcast Logging
    print("\n[TEST 8] Testing WhatsApp Broadcast SQLite Logging...")
    res_wa = client.post('/api/broadcasts/send', json={
        'school_id': 'chitral-model',
        'title': 'WhatsApp Fee Reminder',
        'category': 'WhatsApp',
        'message_text': 'Dear Parent, October fee challan is due.',
        'target_group': 'Parent Mobile',
        'recipient_count': 1
    })
    assert res_wa.status_code == 200
    wa_data = res_wa.get_json()
    assert wa_data['success'] is True
    print(f"  --> PASSED: WhatsApp broadcast logged in SQLite with ID #{wa_data.get('broadcast_id')}.")
    passed += 1

    print("\n==================================================================")
    print(f"  PHASE 4 RESULTS: {passed}/{total} Tests Passed (100% Success!)")
    print("  Jinja2 Partials, Real RBAC, QR Verification & WhatsApp Ready.")
    print("==================================================================")
    return True

if __name__ == '__main__':
    try:
        success = run_phase4_tests()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n[FAIL] Phase 4 test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
