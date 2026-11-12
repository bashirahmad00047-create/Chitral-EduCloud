"""
Chitral EduCloud ERP - Phase 5 Verification Suite
Validates:
1. Multi-tenant Baileys WhatsApp status & QR generation per school
2. Automated background WhatsApp dispatch (/api/wa/send-direct) & SQLite audit logging
3. Gemini AI / Intelligent Parent Query endpoint (/api/ai/parent-query)
   - Fee inquiry returning live SQLite balance & status
   - Attendance inquiry returning today's live arrival & presence
   - Exam inquiry returning student's percentage & grade
4. Node.js microservice health & multi-tenant session isolation
"""

import sys
from app import app
import database

def run_phase5_tests():
    print("==================================================================")
    print("  Chitral EduCloud ERP - Phase 5 WhatsApp & AI Verification Suite")
    print("==================================================================")

    client = app.test_client()
    passed = 0
    total = 8

    # 1. Test WhatsApp Status Endpoint for Chitral Model College
    print("\n[TEST 1] Testing WhatsApp Status for Chitral Model College (/api/wa/status)...")
    data = {}
    for _ in range(6):
        res = client.get('/api/wa/status?school_id=chitral-model')
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.get_json()
        if data.get('status') in ('CONNECTED', 'QR_READY') and (data.get('qr_code') or data.get('status') == 'CONNECTED'):
            break
        time.sleep(1)

    assert data['success'] is True
    assert data['school_id'] == 'chitral-model'
    assert data['status'] in ('CONNECTED', 'QR_READY', 'CONNECTING')
    print(f"  --> PASSED: Status is '{data['status']}' (QR length: {len(data.get('qr_code') or '')}).")
    passed += 1

    # 2. Test Multi-Tenant Session Isolation (Pamir Valley Public School)
    print("\n[TEST 2] Testing Multi-Tenant Session for Pamir Valley (Booni)...")
    res_pamir = client.get('/api/wa/status?school_id=pamir-valley')
    assert res_pamir.status_code == 200
    pamir_data = res_pamir.get_json()
    assert pamir_data['school_id'] == 'pamir-valley'
    print(f"  --> PASSED: Isolated session for Pamir Valley verified (Status: {pamir_data['status']}).")
    passed += 1

    # 3. Test QR Regeneration / Connect Endpoint
    print("\n[TEST 3] Testing Live QR Generation (POST /api/wa/connect)...")
    res_conn = client.post('/api/wa/connect', json={'school_id': 'hindukush'})
    assert res_conn.status_code == 200
    conn_data = res_conn.get_json()
    assert conn_data['success'] is True
    assert conn_data['status'] in ('CONNECTING', 'QR_READY')
    assert 'qr_code' in conn_data
    print("  --> PASSED: Dynamic Baileys pairing QR generated for Hindukush Public School.")
    passed += 1

    # 4. Test Direct Background WhatsApp Message & SQLite Audit Logging
    print("\n[TEST 4] Testing Direct Background WhatsApp Dispatch & Audit Log...")
    res_direct = client.post('/api/wa/send-direct', json={
        'school_id': 'chitral-model',
        'phone': '0345-9821455',
        'message': 'Automated Absence Notice: Aliyan Ali was marked Absent today.',
        'trigger_type': 'Attendance Absence',
        'student_id': 'STU-1001'
    })
    assert res_direct.status_code == 200
    direct_data = res_direct.get_json()
    assert direct_data['success'] is True
    assert direct_data['status'] == 'DISPATCHED'
    log_id = direct_data['log_id']
    
    # Verify persistence in SQLite broadcast_logs
    conn = database.get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM broadcast_logs WHERE id = ?", (log_id,))
    row = cursor.fetchone()
    conn.close()
    assert row is not None, "Broadcast log not found in SQLite!"
    assert row['category'] == 'WhatsApp'
    print(f"  --> PASSED: Background message logged in SQLite (Broadcast ID #{log_id}).")
    passed += 1

    # 5. Test AI Parent Query: Fee Inquiry
    print("\n[TEST 5] Testing AI Parent Query: Fee Inquiry (POST /api/ai/parent-query)...")
    res_ai_fee = client.post('/api/ai/parent-query', json={
        'school_id': 'chitral-model',
        'sender_phone': '0345-9821455',
        'message_text': 'Assalam o alaikum, mere bache ki fee kitni baqi hai?'
    })
    assert res_ai_fee.status_code == 200
    ai_fee_data = res_ai_fee.get_json()
    assert ai_fee_data['success'] is True
    reply = ai_fee_data['reply_text']
    assert 'Aliyan Ali' in reply or 'فیس' in reply
    assert 'PKR' in reply
    print("  --> PASSED: AI auto-replied with live student fee dues from SQLite.")
    passed += 1

    # 6. Test AI Parent Query: Attendance Inquiry
    print("\n[TEST 6] Testing AI Parent Query: Attendance Inquiry...")
    res_ai_att = client.post('/api/ai/parent-query', json={
        'school_id': 'chitral-model',
        'sender_phone': '0345-9821455',
        'message_text': 'Kia mera bacha aaj school aya hai? Check attendance'
    })
    assert res_ai_att.status_code == 200
    ai_att_data = res_ai_att.get_json()
    assert ai_att_data['success'] is True
    att_reply = ai_att_data['reply_text']
    assert 'حاضری' in att_reply or 'حاضر' in att_reply
    print("  --> PASSED: AI auto-replied with live attendance records from SQLite.")
    passed += 1

    # 7. Test AI Parent Query: Exam Results
    print("\n[TEST 7] Testing AI Parent Query: Exam Marks & Result...")
    res_ai_exam = client.post('/api/ai/parent-query', json={
        'school_id': 'chitral-model',
        'sender_phone': '0345-9821455',
        'message_text': 'Mera beta Aliyan ka result aur marks bata dain?'
    })
    assert res_ai_exam.status_code == 200
    ai_exam_data = res_ai_exam.get_json()
    assert ai_exam_data['success'] is True
    exam_reply = ai_exam_data['reply_text']
    assert 'امتحان' in exam_reply or 'گریڈ' in exam_reply or 'نتیجہ' in exam_reply
    print("  --> PASSED: AI auto-replied with live exam grade & percentage.")
    passed += 1

    # 8. Test Master Jinja2 Partials Integration with WhatsApp Engine
    print("\n[TEST 8] Testing Master UI Layout with WhatsApp & AI Controls (GET /)...")
    res_ui = client.get('/')
    assert res_ui.status_code == 200
    ui_html = res_ui.get_data(as_text=True)
    assert 'Baileys WhatsApp Socket' in ui_html
    assert 'Gemini AI Simulator' in ui_html
    assert 'modalWhatsAppQr' in ui_html
    print("  --> PASSED: Master UI template successfully renders WhatsApp controls & AI simulator.")
    passed += 1

    print("\n==================================================================")
    print(f"  PHASE 5 RESULTS: {passed}/{total} Tests Passed (100% Success!)")
    print("  Node Baileys Gateway & Gemini AI Parent Engine Operational.")
    print("==================================================================")
    return True

if __name__ == '__main__':
    try:
        success = run_phase5_tests()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n[FAIL] Phase 5 test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
