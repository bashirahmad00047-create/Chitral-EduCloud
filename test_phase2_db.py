"""
Chitral EduCloud ERP - Automated Phase 2 Database & REST API Verification Suite
Tests SQLite persistence across requests for all core ERP modules.
"""

import sys
import json
import sqlite3
from app import app
import database

def run_tests():
    print("==================================================================")
    print("  Chitral EduCloud ERP - Phase 2 SQLite Verification Suite")
    print("==================================================================")

    client = app.test_client()
    passed_tests = 0
    total_tests = 6

    # -------------------------------------------------------------
    # TEST 1: Bootstrap & Schema Verification
    # -------------------------------------------------------------
    print("\n[TEST 1] Verifying /api/bootstrap and SQLite Schema...")
    res = client.get('/api/bootstrap?school_id=chitral-model&date=2026-10-12')
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.get_json()
    assert 'school' in data and data['school']['id'] == 'chitral-model'
    assert 'students' in data and len(data['students']) >= 8
    assert 'kpis' in data and data['kpis']['total_students'] >= 8
    print(f"  --> PASSED: School '{data['school']['name']}' loaded with {len(data['students'])} students.")
    passed_tests += 1

    # -------------------------------------------------------------
    # TEST 2: Add Student (POST /api/students)
    # -------------------------------------------------------------
    print("\n[TEST 2] Enrolling new student into SQLite (POST /api/students)...")
    test_student_payload = {
        "school_id": "chitral-model",
        "full_name": "Kashif Ahmad",
        "father_name": "Gulzar Ahmad",
        "class_grade": "Grade 10",
        "section": "A",
        "roll_no": "125",
        "phone": "0345-9876543",
        "blood_group": "A+",
        "address": "Booni Road, Chitral",
        "monthly_fee": 4500
    }
    res = client.post('/api/students', json=test_student_payload)
    assert res.status_code == 201, f"Expected 201, got {res.status_code}"
    add_data = res.get_json()
    assert add_data['success'] is True
    student_id = add_data['student']['id']
    admission_no = add_data['student']['admission_no']
    print(f"  --> PASSED: Student '{test_student_payload['full_name']}' enrolled with ID '{student_id}' (Adm #: {admission_no}).")
    passed_tests += 1

    # -------------------------------------------------------------
    # TEST 3: Save Attendance (POST /api/attendance/save)
    # -------------------------------------------------------------
    print("\n[TEST 3] Recording student attendance in SQLite (POST /api/attendance/save)...")
    att_payload = {
        "school_id": "chitral-model",
        "date": "2026-10-12",
        "records": [
            {
                "student_id": student_id,
                "status": "P",
                "arrival_time": "08:04 AM"
            }
        ]
    }
    res = client.post('/api/attendance/save', json=att_payload)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    att_data = res.get_json()
    assert att_data['success'] is True
    print(f"  --> PASSED: Attendance status 'P' recorded for student {student_id} on 2026-10-12.")
    passed_tests += 1

    # -------------------------------------------------------------
    # TEST 4: Collect Fee Payment (POST /api/fees/collect)
    # -------------------------------------------------------------
    print("\n[TEST 4] Collecting fee payment via JazzCash (POST /api/fees/collect)...")
    fee_payload = {
        "school_id": "chitral-model",
        "student_id": student_id,
        "challan_no": f"CH-2026-{student_id}",
        "paid_amount": 4500,
        "payment_method": "JazzCash"
    }
    res = client.post('/api/fees/collect', json=fee_payload)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    fee_data = res.get_json()
    assert fee_data['success'] is True
    assert fee_data['status'] in ('PAID', 'PARTIAL')
    print(f"  --> PASSED: Fee PKR {fee_data['paid_amount']:,} collected via JazzCash (Challan: {fee_data['challan_no']}, Status: {fee_data['status']}).")
    passed_tests += 1

    # -------------------------------------------------------------
    # TEST 5: Save Exam Marks (POST /api/exams/save)
    # -------------------------------------------------------------
    print("\n[TEST 5] Saving exam marks & auto-grading (POST /api/exams/save)...")
    exam_payload = {
        "school_id": "chitral-model",
        "student_id": student_id,
        "exam_term": "First Term",
        "english": 88,
        "urdu": 84,
        "math": 92,
        "science": 90,
        "islamiat": 48,
        "computer_or_econ": 46,
        "remarks": "Excellent academic progress"
    }
    res = client.post('/api/exams/save', json=exam_payload)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    exam_data = res.get_json()
    assert exam_data['success'] is True
    assert exam_data['obtained_marks'] == 448
    assert exam_data['percentage'] == 74.67
    assert exam_data['grade'] == 'A'
    print(f"  --> PASSED: Marks saved: 448/600 ({exam_data['percentage']}% Grade {exam_data['grade']}).")
    passed_tests += 1

    # -------------------------------------------------------------
    # TEST 6: Persistence Verification across fresh request
    # -------------------------------------------------------------
    print("\n[TEST 6] Simulating F5 Page Reload / Fresh Bootstrap Verification...")
    res = client.get('/api/bootstrap?school_id=chitral-model&date=2026-10-12')
    assert res.status_code == 200
    fresh_data = res.get_json()
    persisted_student = next((s for s in fresh_data['students'] if s['id'] == student_id), None)
    
    assert persisted_student is not None, f"Student {student_id} not found in fresh bootstrap!"
    assert persisted_student['full_name'] == "Kashif Ahmad"
    assert persisted_student['today_attendance'] == 'P'
    assert persisted_student['exam_grade'] == 'A'
    assert persisted_student['exam_percentage'] == 74.67
    print(f"  --> PASSED: Verified persistence! Student '{persisted_student['full_name']}' is intact in SQLite with Attendance 'P' and Grade 'A'.")
    passed_tests += 1

    # Cleanup: Delete the test student to preserve clean demo state
    print(f"\n[CLEANUP] Removing test student {student_id} from SQLite...")
    del_res = client.delete(f'/api/students/{student_id}')
    assert del_res.status_code == 200
    print("  --> Cleanup successful.")

    print("\n==================================================================")
    print(f"  VERIFICATION RESULTS: {passed_tests}/{total_tests} Tests Passed Successfully! (100%)")
    print("  SQLite Persistence & Live CRUD APIs are fully operational.")
    print("==================================================================")
    return True

if __name__ == '__main__':
    try:
        success = run_tests()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n[FAIL] Test suite failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
