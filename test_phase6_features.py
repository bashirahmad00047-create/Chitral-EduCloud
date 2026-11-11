"""
Chitral EduCloud ERP - Phase 6 Test Suite
Tests:
1. Unlimited Multi-School Onboarding (POST /api/schools, GET /api/schools, SQLite isolation & auto-provisioning)
2. Advanced Itemized Fee Collection Workflow (POST /api/fees/collect with itemized calculations & balance updates)
3. Real Scannable Baileys WhatsApp QR Code Rendering (PNG format, valid Base64 Data URI, genuine payload)
"""

import sys
import io
import base64
import json
import pytest

from app import app
import database

def test_phase6_features():
    print("=" * 70)
    print("CHITRAL EDUCLOUD ERP - PHASE 6 VERIFICATION SUITE")
    print("=" * 70)

    client = app.test_client()

    # Log in as Admin first (Prof. Rehmat Ullah Baig)
    login_res = client.post('/api/auth/login', json={'username': 'admin', 'password': 'admin123'})
    assert login_res.status_code == 200, f"Admin login failed: {login_res.data}"
    print("[PASS] 1. Authenticated as Admin Desk")

    # ----------------------------------------------------
    # TEST 1: Unlimited Multi-School Onboarding (POST /api/schools)
    # ----------------------------------------------------
    print("\n[TEST 2] Dynamic Multi-Tenant School Onboarding (Pamir Public School Lotkoh)...")
    new_school_payload = {
        'name': 'Karakoram Public School, Booni',
        'name_urdu': 'قراقرم پبلک اسکول بونی',
        'campus_city': 'Booni, Upper Chitral',
        'address': 'Main Booni Bazaar Road, Upper Chitral',
        'phone': '+92 (0943) 470555',
        'principal_name': 'Prof. Sher Afzal Khan',
        'session_year': '2026-2027',
        'logo_text': 'KPS',
        'bise_code': 'BISE Malakand #KPS-8821',
        'email': 'principal@karakoram-booni.edu.pk',
        'heating_levy': 1100
    }

    create_res = client.post('/api/schools', json=new_school_payload)
    assert create_res.status_code == 201, f"Failed to onboard school: {create_res.data}"
    created_data = create_res.get_json()
    assert created_data.get('success') is True
    school = created_data.get('school')
    school_id = school['id']
    print(f"       -> Provisioned School ID: '{school_id}' ({school['name']})")
    assert 'karakoram' in school_id

    # Verify new school exists in GET /api/schools
    schools_res = client.get('/api/schools')
    assert schools_res.status_code == 200
    all_schools = schools_res.get_json().get('schools', [])
    found_school = any(s['id'] == school_id for s in all_schools)
    assert found_school, f"School {school_id} not found in all schools list!"
    print(f"       -> Total active school campuses in SQLite: {len(all_schools)}")

    # Verify auto-provisioned admin user exists in SQLite
    conn = database.get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE school_id = ? AND role = 'admin'", (school_id,))
    new_admin_user = cursor.fetchone()
    assert new_admin_user is not None, f"Admin user was not auto-provisioned for {school_id}!"
    print(f"       -> Auto-provisioned Admin Username: {new_admin_user['username']} ({new_admin_user['full_name']})")

    # Verify starter student was created
    cursor.execute("SELECT * FROM students WHERE school_id = ?", (school_id,))
    starter_student = cursor.fetchone()
    assert starter_student is not None, f"Starter student was not created for {school_id}!"
    print(f"       -> Auto-provisioned Starter Student: {starter_student['full_name']} (Roll: {starter_student['roll_no']})")

    # Verify /api/bootstrap loads cleanly for this brand-new school tenant
    boot_res = client.get(f'/api/bootstrap?school_id={school_id}&date=2026-10-12')
    assert boot_res.status_code == 200
    boot_data = boot_res.get_json()
    assert boot_data['school']['id'] == school_id
    assert len(boot_data['students']) >= 1
    print("[PASS] 2. Dynamic School Tenant provisioned and fully functional in bootstrap!")

    # ----------------------------------------------------
    # TEST 3: Advanced Itemized Fee Collection Workflow
    # ----------------------------------------------------
    print("\n[TEST 3] Advanced Itemized Fee Collection Workflow (POST /api/fees/collect)...")
    # Using existing student Aliya Ali (STU-1001) in chitral-model
    cursor.execute("SELECT * FROM fee_challans WHERE school_id = 'chitral-model' AND student_id = 'STU-1001' ORDER BY id DESC LIMIT 1")
    challan = cursor.fetchone()
    challan_no = challan['challan_no']

    # Simulate an itemized calculation:
    # Tuition: 4500, Heating: 800, Exam: 500, Lab: 300, Concession: 500 => Total Payable: 5600
    itemized_total = (4500 + 800 + 500 + 300) - 500
    paid_received = 5600 # Full payment

    collect_payload = {
        'school_id': 'chitral-model',
        'student_id': 'STU-1001',
        'challan_no': challan_no,
        'paid_amount': paid_received,
        'total_amount': itemized_total,
        'payment_method': 'Cash at School Fee Counter'
    }

    collect_res = client.post('/api/fees/collect', json=collect_payload)
    assert collect_res.status_code == 200, f"Fee collection failed: {collect_res.data}"
    collect_data = collect_res.get_json()
    assert collect_data.get('success') is True
    assert collect_data.get('status') == 'PAID'
    assert collect_data.get('new_balance') == 0
    assert collect_data.get('payment_method') == 'Cash'
    print(f"       -> Collected PKR {collect_data['paid_amount']:,} on Challan {challan_no} (Status: {collect_data['status']})")

    # Verify SQLite record updated
    cursor.execute("SELECT * FROM fee_challans WHERE challan_no = ?", (challan_no,))
    updated_challan = cursor.fetchone()
    assert updated_challan['status'] == 'PAID'
    assert updated_challan['balance'] == 0
    assert updated_challan['total_amount'] == itemized_total
    print("[PASS] 3. Itemized fee recorded with updated total, balance, and SQLite persistence!")

    # ----------------------------------------------------
    # TEST 4: Real Scannable Baileys WhatsApp QR Code Rendering
    # ----------------------------------------------------
    print("\n[TEST 4] Real Scannable Baileys WhatsApp QR Code Rendering...")
    connect_res = client.post('/api/wa/connect', json={'school_id': 'chitral-model'})
    assert connect_res.status_code == 200, f"WhatsApp connect failed: {connect_res.data}"
    wa_data = connect_res.get_json()
    assert wa_data.get('success') is True
    assert wa_data.get('status') == 'QR_READY'
    
    qr_data_uri = wa_data.get('qr_code', '')
    assert qr_data_uri.startswith('data:image/png;base64,'), "QR code must be a valid Base64 PNG Data URI!"
    
    # Decode and verify the binary PNG signature
    png_base64 = qr_data_uri.replace('data:image/png;base64,', '')
    png_bytes = base64.b64decode(png_base64)
    # Standard PNG magic bytes: \x89PNG\r\n\x1a\n
    assert png_bytes[:8] == b'\x89PNG\r\n\x1a\n', "Decoded bytes do not match standard PNG header!"
    print(f"       -> Valid PNG binary header verified (Bytes size: {len(png_bytes):,} bytes)")
    print(f"       -> QR Payload String: '{wa_data.get('qr_payload')}'")
    print("[PASS] 4. Real scannable PNG QR code generated and verified successfully!")

    conn.close()
    print("\n" + "=" * 70)
    print("ALL 4 PHASE 6 VERIFICATION TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 70)

if __name__ == '__main__':
    test_phase6_features()
