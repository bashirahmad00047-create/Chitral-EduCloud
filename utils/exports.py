import io
import csv
from flask import Response

def create_csv_response(csv_content, filename):
    # Prepend UTF-8 Byte Order Mark (\ufeff) for crisp Urdu & English rendering in MS Excel
    response = Response(
        '\ufeff' + csv_content,
        mimetype="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
    return response

def generate_students_csv(students, school_name="Chitral School"):
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

    writer.writerow([f"STUDENT ROSTER - {school_name.upper()}"])
    writer.writerow(["Generated: Chitral EduCloud ERP", "Session: 2026-2027"])
    writer.writerow([])
    writer.writerow([
        "Roll No", "Admission No", "Student Name", "Father Name", 
        "Class", "Section", "Gender", "Phone", "Blood Group", 
        "Village / Address", "Monthly Fee (PKR)", "Fee Status", "Status"
    ])

    for s in students:
        writer.writerow([
            s.get('roll_no', ''),
            s.get('admission_no', ''),
            s.get('full_name', ''),
            s.get('father_name', ''),
            s.get('class_grade', ''),
            s.get('section', ''),
            s.get('gender', ''),
            s.get('phone', ''),
            s.get('blood_group', ''),
            s.get('address', 'Chitral'),
            s.get('monthly_fee', 0),
            s.get('fee_status', 'UNPAID'),
            s.get('status', 'Active')
        ])

    return output.getvalue()

def generate_attendance_csv(records, date_str, school_name="Chitral School"):
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

    writer.writerow([f"DAILY CLASS ATTENDANCE REGISTER - {school_name.upper()}"])
    writer.writerow([f"Date: {date_str}", "Chitral EduCloud Attendance Engine"])
    writer.writerow([])
    writer.writerow([
        "Roll No", "Student Name", "Father Name", "Class & Section", 
        "Status (P/A/L)", "Arrival Time", "Marked By"
    ])

    for r in records:
        status_label = "Present" if r.get('status') == 'P' else ("Absent" if r.get('status') == 'A' else "Leave")
        writer.writerow([
            r.get('roll_no', ''),
            r.get('student_name', ''),
            r.get('father_name', ''),
            f"{r.get('class_grade', '')}-{r.get('section', '')}",
            status_label,
            r.get('arrival_time', '--:--'),
            r.get('marked_by', 'Class Teacher')
        ])

    return output.getvalue()

def generate_fees_csv(challans, school_name="Chitral School"):
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

    writer.writerow([f"FEE COLLECTION & ARREARS REGISTER - {school_name.upper()}"])
    writer.writerow(["Month: October 2026", "Currency: PKR"])
    writer.writerow([])
    writer.writerow([
        "Challan No", "Roll No", "Student Name", "Class & Section", 
        "Tuition Fee (PKR)", "Arrears (PKR)", "Total Amount (PKR)", 
        "Paid Amount (PKR)", "Balance Due (PKR)", "Status", "Payment Method", "Paid Date"
    ])

    for c in challans:
        writer.writerow([
            c.get('challan_no', ''),
            c.get('roll_no', ''),
            c.get('student_name', ''),
            f"{c.get('class_grade', '')}-{c.get('section', '')}",
            c.get('tuition_fee', 0),
            c.get('arrears', 0),
            c.get('total_amount', 0),
            c.get('paid_amount', 0),
            c.get('balance', 0),
            c.get('status', 'UNPAID'),
            c.get('payment_method', 'Pending'),
            c.get('paid_date', '--')
        ])

    return output.getvalue()

def generate_exam_marks_csv(marks_list, term="First Term", school_name="Chitral School"):
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

    writer.writerow([f"EXAMINATION MERIT & MARKS LEDGER - {school_name.upper()}"])
    writer.writerow([f"Term: {term}", "Session: 2026-2027"])
    writer.writerow([])
    writer.writerow([
        "Roll No", "Student Name", "Class & Section", 
        "English (100)", "Urdu (100)", "Math (100)", "Science (100)", 
        "Islamiat (50)", "Pakistan Studies (50)", "Total (600)", 
        "Obtained", "Percentage %", "BISE Grade", "Remarks"
    ])

    for m in marks_list:
        writer.writerow([
            m.get('roll_no', ''),
            m.get('student_name', ''),
            f"{m.get('class_grade', '')}-{m.get('section', '')}",
            m.get('english', 0),
            m.get('urdu', 0),
            m.get('math', 0),
            m.get('science', 0),
            m.get('islamiat', 0),
            m.get('computer_or_econ', 0),
            m.get('total_marks', 600),
            m.get('obtained_marks', 0),
            f"{m.get('percentage', 0.0)}%",
            m.get('grade', 'F'),
            m.get('remarks', '')
        ])

    return output.getvalue()
