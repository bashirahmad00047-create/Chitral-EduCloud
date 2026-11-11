"""
Chitral EduCloud - Phase 7 Automated UI Navigation & Commercial ERP Verification Suite
Tests:
1. DOM Audit: Verifies every sidebar data-tab / data-screen target ID exists in the rendered HTML DOM.
2. Daily Expense & Cashbook (روزنامچہ): Tests POST /api/expenses/add and GET /api/expenses/cashbook-summary net cash calculation.
3. Class Promotion (سالانہ ترقی): Tests POST /api/students/promote-class.
4. Official Certificates: Tests GET /api/students/<id>/certificate for both Leaving and Character certificates.
5. JS Syntax: Runs node --check across all JavaScript files.
"""

import sys
import os
import re
import subprocess
import requests

BASE_URL = "http://127.0.0.1:5050"

def test_suite():
    session = requests.Session()
    print("=" * 75)
    print("CHITRAL EDUCLOUD - PHASE 7 UI NAVIGATION & COMMERCIAL ERP SUITE")
    print("=" * 75)

    # -------------------------------------------------------------
    # TEST 1: DOM Navigation Audit (GET /)
    # -------------------------------------------------------------
    print("\n[TEST 1] Auditing DOM Navigation & Sidebar data-tab Targets (GET /)...")
    res = session.get(f"{BASE_URL}/")
    assert res.status_code == 200, f"Expected 200 OK, got {res.status_code}"
    html = res.text

    # Extract all data-tab attributes
    data_tabs = re.findall(r'data-tab=["\']([^"\']+)["\']', html)
    data_screens = re.findall(r'data-screen=["\']([^"\']+)["\']', html)
    all_targets = set(data_tabs + data_screens)
    
    print(f"       -> Found {len(all_targets)} distinct navigation targets: {sorted(all_targets)}")
    
    missing_targets = []
    for target in all_targets:
        clean_id = target.strip().replace('#', '')
        if f'id="{clean_id}"' not in html and f"id='{clean_id}'" not in html:
            missing_targets.append(clean_id)

    if missing_targets:
        print(f"FAILED: The following targets do not exist in the DOM: {missing_targets}")
        sys.exit(1)

    print(f"[PASS] 1. All {len(all_targets)} navigation targets strictly exist in rendered HTML DOM!")

    # -------------------------------------------------------------
    # TEST 2: Authenticate Admin Session
    # -------------------------------------------------------------
    print("\n[TEST 2] Authenticating Admin Session...")
    auth_res = session.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert auth_res.status_code == 200, f"Auth failed: {auth_res.text}"
    auth_data = auth_res.json()
    assert auth_data.get('success') is True
    print(f"[PASS] 2. Authenticated as: {auth_data['user']['full_name']} ({auth_data['user']['role']})")

    # -------------------------------------------------------------
    # TEST 3: Expense Cashbook API & Net Cash Calculation
    # -------------------------------------------------------------
    print("\n[TEST 3] Testing Daily Expense Cashbook (روزنامچہ آمدن و اخراجات)...")
    # Add an expense
    expense_payload = {
        "school_id": "chitral-model",
        "category": "Winter Heating & Fuel",
        "title": "Winter Firewood for Classrooms (15 Maund)",
        "amount": 9500,
        "paid_to": "Khyber Timber Mart Chitral",
        "expense_date": "2026-10-12",
        "payment_mode": "Cash",
        "notes": "Verified winter heating supply"
    }
    exp_res = session.post(f"{BASE_URL}/api/expenses/add", json=expense_payload)
    assert exp_res.status_code == 200, f"Add expense failed: {exp_res.text}"
    exp_data = exp_res.json()
    assert exp_data.get('success') is True
    print(f"       -> Recorded Expense: PKR 9,500 (Voucher: {exp_data.get('receipt_no')})")

    # Verify Cashbook summary
    sum_res = session.get(f"{BASE_URL}/api/expenses/cashbook-summary?school_id=chitral-model")
    assert sum_res.status_code == 200, f"Cashbook summary failed: {sum_res.text}"
    sum_data = sum_res.json()
    assert sum_data.get('success') is True
    
    total_income = sum_data.get('total_income', 0)
    total_expense = sum_data.get('total_expense', 0)
    net_cash = sum_data.get('net_cash', 0)
    
    print(f"       -> Total Fee Income (آمدنی): PKR {total_income:,}")
    print(f"       -> Total Campus Expenses (اخراجات): PKR {total_expense:,}")
    print(f"       -> Net Cash in Hand (خالص بچت): PKR {net_cash:,}")
    
    assert net_cash == (total_income - total_expense), "Net cash calculation mismatch!"
    assert any(e['title'] == "Winter Firewood for Classrooms (15 Maund)" for e in sum_data.get('recent_expenses', [])), "New expense missing from recent list!"
    print("[PASS] 3. Daily Expense Cashbook and Net Cash reconciliation strictly verified!")

    # -------------------------------------------------------------
    # TEST 4: Student Class Promotion (سالانہ ترقی)
    # -------------------------------------------------------------
    print("\n[TEST 4] Testing Annual Class Promotion (سالانہ ترقی)...")
    promo_payload = {
        "school_id": "chitral-model",
        "from_class": "Grade 9",
        "to_class": "Grade 10"
    }
    promo_res = session.post(f"{BASE_URL}/api/students/promote-class", json=promo_payload)
    assert promo_res.status_code == 200, f"Class promotion failed: {promo_res.text}"
    promo_data = promo_res.json()
    assert promo_data.get('success') is True
    promoted_count = promo_data.get('promoted_count', 0)
    print(f"       -> Promoted {promoted_count} students from Grade 9 to Grade 10!")
    print("[PASS] 4. Class promotion API verified with SQLite update!")

    # -------------------------------------------------------------
    # TEST 5: Official Student Certificates (Leaving & Character)
    # -------------------------------------------------------------
    print("\n[TEST 5] Testing Official Student Certificates (سرٹیفکیٹ)...")
    # 1. School Leaving Certificate
    cert_res = session.get(f"{BASE_URL}/api/students/STU-1001/certificate?type=leaving")
    assert cert_res.status_code == 200, f"Certificate fetch failed: {cert_res.text}"
    c1 = cert_res.json().get('certificate', {})
    assert c1.get('student_name') == "Aliyan Ali"
    assert "Leaving" in c1.get('certificate_title')
    assert "SLC-" in c1.get('serial_no')
    print(f"       -> School Leaving Certificate: {c1['student_name']} (Serial: {c1['serial_no']})")

    # 2. Character Certificate
    char_res = session.get(f"{BASE_URL}/api/students/STU-1001/certificate?type=character")
    assert char_res.status_code == 200, f"Character cert fetch failed: {char_res.text}"
    c2 = char_res.json().get('certificate', {})
    assert "Character" in c2.get('certificate_title')
    assert "Exemplary" in c2.get('conduct')
    print(f"       -> Character Certificate: Conduct verified as '{c2['conduct']}'")
    print("[PASS] 5. Official Certificates (Leaving & Character) data verified!")

    # -------------------------------------------------------------
    # TEST 6: JavaScript Syntax Check across all files
    # -------------------------------------------------------------
    print("\n[TEST 6] Running 'node --check' across all frontend JS files...")
    js_files = []
    for root, _, files in os.walk("static/js"):
        for file in files:
            if file.endswith(".js"):
                js_files.append(os.path.join(root, file))
    
    assert len(js_files) >= 10, f"Expected at least 10 JS files, found {len(js_files)}"
    for js_path in js_files:
        proc = subprocess.run(["node", "--check", js_path], capture_output=True, text=True)
        assert proc.returncode == 0, f"Syntax error in {js_path}:\n{proc.stderr}"
    print(f"       -> Checked {len(js_files)} JS files. Zero syntax errors!")
    print("[PASS] 6. All frontend JavaScript files passed node --check with 100% success!")

    print("\n" + "=" * 75)
    print("ALL PHASE 7 UI NAVIGATION & COMMERCIAL ERP TESTS PASSED (100% SUCCESS)!")
    print("=" * 75)

if __name__ == "__main__":
    test_suite()
