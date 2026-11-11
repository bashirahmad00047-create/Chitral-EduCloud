// Chitral EduCloud ERP - API Service Client

const api = {
  // Bootstrap & Settings
  async getBootstrap(schoolId, date = '2026-10-12') {
    const res = await fetch(`/api/bootstrap?school_id=${encodeURIComponent(schoolId)}&date=${encodeURIComponent(date)}`);
    if (!res.ok) throw new Error(`Bootstrap failed with status ${res.status}`);
    return await res.json();
  },

  async updateSchoolSettings(schoolId, payload) {
    const res = await fetch(`/api/schools/${encodeURIComponent(schoolId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  },

  // Authentication
  async login(username, password, schoolId) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, school_id: schoolId })
    });
    return await res.json();
  },

  async demoLogin(role, schoolId) {
    const res = await fetch('/api/auth/demo-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, school_id: schoolId })
    });
    return await res.json();
  },

  async getSession() {
    const res = await fetch('/api/auth/session');
    return await res.json();
  },

  async logout() {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    return await res.json();
  },

  // Students SIS
  async addStudent(payload) {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  },

  async updateStudent(studentId, payload) {
    const res = await fetch(`/api/students/${encodeURIComponent(studentId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  },

  async deleteStudent(studentId) {
    const res = await fetch(`/api/students/${encodeURIComponent(studentId)}`, {
      method: 'DELETE'
    });
    return await res.json();
  },

  // Attendance
  async saveAttendance(schoolId, date, records) {
    const res = await fetch('/api/attendance/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ school_id: schoolId, date: date, records: records })
    });
    return await res.json();
  },

  // Fees & Finance
  async collectFee(payload) {
    const res = await fetch('/api/fees/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  },

  async generateChallans(schoolId, monthYear, includeHeating = true) {
    const res = await fetch('/api/fees/generate-challans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ school_id: schoolId, month_year: monthYear, include_heating: includeHeating })
    });
    return await res.json();
  },

  async payStaff(empId, schoolId) {
    const res = await fetch('/api/staff/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emp_id: empId, school_id: schoolId })
    });
    return await res.json();
  },

  // Examination
  async saveExamMarks(payload) {
    const res = await fetch('/api/exams/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  },

  // Broadcasts
  async sendBroadcast(payload) {
    const res = await fetch('/api/broadcasts/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  },

  // Export URLs
  getStudentsExportUrl(schoolId) {
    return `/api/export/students.csv?school_id=${encodeURIComponent(schoolId)}`;
  },

  getFeesExportUrl(schoolId) {
    return `/api/export/fees.csv?school_id=${encodeURIComponent(schoolId)}`;
  },

  getAttendanceExportUrl(schoolId, date) {
    return `/api/export/attendance.csv?school_id=${encodeURIComponent(schoolId)}&date=${encodeURIComponent(date)}`;
  },

  getExamsExportUrl(schoolId, term = 'Mid-Term 2026') {
    return `/api/export/exams.csv?school_id=${encodeURIComponent(schoolId)}&term=${encodeURIComponent(term)}`;
  }
};
