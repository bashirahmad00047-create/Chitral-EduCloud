"""
Chitral EduCloud - Phase 8 Multi-Tenancy Gateway Verification Suite
Tests:
1. Public Gateway state on unauthenticated visit (/api/auth/me & /api/schools/public-list)
2. Strict Public School Self-Registration (/api/schools/register) with instant session setup
3. Strict Multi-Tenant Backend Isolation (ensuring authenticated users cannot peek at other schools)
4. 1-Click Demo Login (/api/auth/demo-login)
5. Standard Credentials Login (/api/auth/login) & Invalid Password Rejection
6. Clean Logout (/api/auth/logout) returning to Gateway mode
"""

import pytest
from app import app
import database

@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['SECRET_KEY'] = 'test-secret-key-phase8'
    with app.test_client() as client:
        yield client

def test_phase8_gateway_and_isolation(client):
    print("\n" + "="*70)
    print("  PHASE 8: BASHFLOW-STYLE STRICT MULTI-TENANCY GATEWAY TEST SUITE")
    print("="*70)

    # 1. Unauthenticated Gateway State
    print("\n[TEST 1] Testing Unauthenticated Visitor State (Public Gateway)...")
    res_me = client.get('/api/auth/me')
    assert res_me.status_code == 200
    data_me = res_me.get_json()
    assert data_me['authenticated'] is False, "Visitor must be unauthenticated on initial load"
    assert data_me['user'] is None

    # Test Public Schools List
    res_pub = client.get('/api/schools/public-list')
    assert res_pub.status_code == 200
    data_pub = res_pub.get_json()
    assert data_pub['success'] is True
    assert len(data_pub['schools']) >= 1
    school_names = [s['name'] for s in data_pub['schools']]
    print(f"       -> Public Directory returned {len(data_pub['schools'])} registered schools")
    print(f"       -> Sample schools: {school_names[:3]}")
    print("[PASS] 1. Unauthenticated visitor strictly sees public gateway & school directory!")

    # 2. Public School Self-Registration Gateway (POST /api/schools/register)
    print("\n[TEST 2] Testing Public School Self-Registration Gateway (/api/schools/register)...")
    import time
    unique_suffix = int(time.time()) % 100000
    reg_payload = {
        'name': f"Hindukush Public Academy {unique_suffix}",
        'name_urdu': f"ہندوکش پبلک اکیڈمی {unique_suffix}",
        'campus_city': "Drosh",
        'address': "Main Drosh Bazaar Road, Lower Chitral",
        'bise_code': f"BISE-DR-{unique_suffix}",
        'principal_name': "Engr. Saeedullah Khan",
        'phone': "+92 345 8899770",
        'default_monthly_fee': 3800,
        'heating_levy': 750,
        'admin_username': f"admin_hpa_{unique_suffix}",
        'admin_password': "DroshPassword123!"
    }
    res_reg = client.post('/api/schools/register', json=reg_payload)
    assert res_reg.status_code == 201, f"Failed registration: {res_reg.data}"
    data_reg = res_reg.get_json()
    assert data_reg['success'] is True
    new_school = data_reg['school']
    new_school_id = new_school['id']
    print(f"       -> Registered New School Tenant: '{new_school['name']}' (ID: {new_school_id})")
    print(f"       -> Auto-provisioned Principal: {data_reg['user']['full_name']} (Username: {data_reg['user']['username']})")

    # Verify session was automatically established upon registration
    res_me_after_reg = client.get('/api/auth/me')
    assert res_me_after_reg.status_code == 200
    me_reg_data = res_me_after_reg.get_json()
    assert me_reg_data['authenticated'] is True
    assert me_reg_data['user']['school_id'] == new_school_id
    print(f"       -> Session auto-established strictly for tenant: {me_reg_data['user']['school_id']}")
    print("[PASS] 2. Self-service school registration & instant session provisioning verified!")

    # 3. Strict Multi-Tenant Backend Isolation
    print("\n[TEST 3] Testing Strict Multi-Tenant Isolation (No Cross-Tenant Peeking)...")
    # Even if requesting chitral-model via query param, backend must force session school
    res_boot = client.get('/api/bootstrap?school_id=chitral-model')
    assert res_boot.status_code == 200
    data_boot = res_boot.get_json()
    assert data_boot['school']['id'] == new_school_id, f"Expected {new_school_id}, got {data_boot['school']['id']}"
    assert data_boot['school']['id'] != 'chitral-model', "Security violation: Cross-tenant peek allowed!"
    print(f"       -> Queried /api/bootstrap?school_id=chitral-model, backend strictly enforced: {data_boot['school']['id']}")

    # Check cashbook summary strictly isolates to this new school
    res_cash = client.get('/api/expenses/cashbook-summary?school_id=chitral-model')
    assert res_cash.status_code == 200
    cash_data = res_cash.get_json()
    assert cash_data['school_id'] == new_school_id, "Cashbook must be strictly scoped to session school"
    print(f"       -> Cashbook summary strictly isolated to tenant: {cash_data['school_id']}")
    print("[PASS] 3. Backend multi-tenant isolation guard strictly blocks unauthorized tenant peeking!")

    # 4. Clean Logout
    print("\n[TEST 4] Testing Clean Logout to Gateway (/api/auth/logout)...")
    res_logout = client.post('/api/auth/logout')
    assert res_logout.status_code == 200
    res_me_logged_out = client.get('/api/auth/me')
    assert res_me_logged_out.get_json()['authenticated'] is False
    print("       -> Session terminated. User returned to Gateway mode.")
    print("[PASS] 4. Clean logout verified!")

    # 5. 1-Click Demo Login Gateway
    print("\n[TEST 5] Testing 1-Click Demo Login Gateway (/api/auth/demo-login)...")
    res_demo = client.post('/api/auth/demo-login', json={'role': 'teacher', 'school_id': 'chitral-model'})
    assert res_demo.status_code == 200
    data_demo = res_demo.get_json()
    assert data_demo['success'] is True
    assert data_demo['user']['role'] == 'teacher'
    assert data_demo['user']['school_id'] == 'chitral-model'
    print(f"       -> Demo authenticated: {data_demo['user']['full_name']} (Role: {data_demo['user']['role']})")
    print("[PASS] 5. 1-Click Demo login successfully authenticated!")

    # 6. Standard Credentials Login & Wrong Password Rejection
    print("\n[TEST 6] Testing Credentials Login & Security Rejection...")
    # Bad credentials
    res_bad = client.post('/api/auth/login', json={'username': 'admin_cmc', 'password': 'wrongpassword123'})
    assert res_bad.status_code == 401
    print("       -> Invalid password rejected with HTTP 401 Unauthorized.")

    # Valid credentials
    res_good = client.post('/api/auth/login', json={'username': 'admin', 'password': 'admin123', 'school_id': 'chitral-model'})
    assert res_good.status_code == 200
    data_good = res_good.get_json()
    assert data_good['success'] is True
    assert data_good['user']['username'] == 'admin'
    print(f"       -> Valid login authenticated: {data_good['user']['full_name']}")
    print("[PASS] 6. Credentials authentication & security rejection verified!")

    print("\n" + "="*70)
    print("  ALL PHASE 8 MULTI-TENANCY & GATEWAY TESTS PASSED (100% SUCCESS)!")
    print("="*70)

if __name__ == '__main__':
    pytest.main([__file__, "-v", "-s"])
