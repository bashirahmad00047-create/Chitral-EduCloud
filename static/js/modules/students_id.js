// ==================== SCREEN 3: STUDENT SIS ====================
function renderStudentsTable(filterText = '', classFilter = 'All', feeFilter = 'All') {
  const tbody = document.getElementById('studentTableBody');
  if (!tbody) return;

  const isUr = state.currentLang === 'ur';
  let filtered = state.students;

  if (classFilter !== 'All') {
    filtered = filtered.filter(s => s.class_grade === classFilter);
  }

  if (feeFilter !== 'All') {
    filtered = filtered.filter(s => s.fee_status === feeFilter || (feeFilter === 'Paid' && s.fee_status === 'PAID') || (feeFilter === 'Pending' && s.fee_status === 'UNPAID'));
  }

  if (filterText.trim()) {
    const query = filterText.toLowerCase();
    filtered = filtered.filter(s => 
      s.full_name.toLowerCase().includes(query) ||
      (s.name_urdu && s.name_urdu.includes(query)) ||
      String(s.roll_no).includes(query) ||
      s.admission_no.toLowerCase().includes(query) ||
      s.phone.includes(query) ||
      (s.address && s.address.toLowerCase().includes(query))
    );
  }

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400">No students found matching current filters in SQLite database.</td></tr>`;
    document.getElementById('studentTableCounter').innerText = "Showing 0 students";
    return;
  }

  document.getElementById('studentTableCounter').innerText = `Showing ${filtered.length} of ${state.students.length} Students (SQLite)`;

  filtered.forEach(stu => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition border-b border-slate-100 dark:border-slate-700";

    const isPaid = stu.fee_status === 'PAID' || stu.fee_status === 'Paid';
    const feeBadgeClass = isPaid ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
      'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';

    tr.innerHTML = `
      <td class="p-3.5">
        <span class="font-extrabold text-slate-900 dark:text-white">#${stu.roll_no}</span>
        <span class="block text-[10px] text-slate-400">${stu.admission_no}</span>
      </td>
      <td class="p-3.5 font-bold text-slate-800 dark:text-slate-100">
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
            ${stu.full_name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <span>${isUr && stu.name_urdu ? stu.name_urdu : stu.full_name}</span>
            <span class="block text-[10px] text-slate-400 font-normal">${stu.gender} &middot; Blood: ${stu.blood_group || 'O+'}</span>
          </div>
        </div>
      </td>
      <td class="p-3.5">
        <span class="font-semibold text-slate-700 dark:text-slate-300">${isUr && stu.father_name_urdu ? stu.father_name_urdu : stu.father_name}</span>
        <span class="block text-[10px] text-slate-400"><i class="fa-solid fa-phone text-[9px] mr-1"></i>${stu.phone}</span>
      </td>
      <td class="p-3.5 font-semibold text-slate-700 dark:text-slate-300">${stu.class_grade} - ${stu.section}</td>
      <td class="p-3.5 text-slate-500 text-[11px]"><i class="fa-solid fa-location-dot text-emerald-600 text-[10px] mr-1"></i>${stu.address || 'Chitral'}</td>
      <td class="p-3.5">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${feeBadgeClass}">
          ${stu.fee_status || 'UNPAID'}
        </span>
      </td>
      <td class="p-3.5 text-center">
        <div class="flex items-center justify-center gap-1.5">
          <button onclick="viewStudentProfile('${stu.id}')" class="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-600" title="View 360 Profile">
            <i class="fa-solid fa-id-badge text-xs"></i>
          </button>
          <button onclick="viewStudentIdCard('${stu.id}')" class="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 hover:text-purple-700" title="View ID Card">
            <i class="fa-solid fa-qrcode text-xs"></i>
          </button>
          <button onclick="openCollectFeeModal('${stu.id}')" class="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 hover:text-emerald-700" title="Fee Ledger">
            <i class="fa-solid fa-receipt text-xs"></i>
          </button>
          <button onclick="deleteStudentRecord('${stu.id}')" class="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-500 hover:text-rose-700" title="Delete Student">
            <i class="fa-solid fa-trash text-xs"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterStudentsTable() {
  const search = document.getElementById('studentSearchInput').value;
  const cls = document.getElementById('filterClassSelect').value;
  const fee = document.getElementById('filterFeeStatusSelect').value;
  renderStudentsTable(search, cls, fee);
}

function resetStudentFilters() {
  document.getElementById('studentSearchInput').value = '';
  document.getElementById('filterClassSelect').value = 'All';
  document.getElementById('filterFeeStatusSelect').value = 'All';
  renderStudentsTable();
}

function exportStudentsCsv() {
  const url = typeof api !== 'undefined' && api.getStudentsExportUrl 
    ? api.getStudentsExportUrl(state.currentSchoolId) 
    : `/api/export/students.csv?school_id=${encodeURIComponent(state.currentSchoolId)}`;
  window.open(url, '_blank');
  showToast("Downloading Student SIS Roster (UTF-8 Excel CSV)...");
}

function exportAttendanceCsv() {
  const dateInput = document.getElementById('attDatePicker');
  const dateStr = dateInput ? dateInput.value : state.currentDate;
  const url = typeof api !== 'undefined' && api.getAttendanceExportUrl 
    ? api.getAttendanceExportUrl(state.currentSchoolId, dateStr) 
    : `/api/export/attendance.csv?school_id=${encodeURIComponent(state.currentSchoolId)}&date=${encodeURIComponent(dateStr)}`;
  window.open(url, '_blank');
  showToast("Downloading Daily Attendance Register (UTF-8 Excel CSV)...");
}

function exportFeeLedgerCsv() {
  const url = typeof api !== 'undefined' && api.getFeesExportUrl 
    ? api.getFeesExportUrl(state.currentSchoolId) 
    : `/api/export/fees.csv?school_id=${encodeURIComponent(state.currentSchoolId)}`;
  window.open(url, '_blank');
  showToast("Downloading Fee Collection Ledger (UTF-8 Excel CSV)...");
}

function exportExamMeritCsv() {
  const termSelect = document.getElementById('examTermSelect');
  const term = termSelect ? termSelect.value : "First Term";
  const url = typeof api !== 'undefined' && api.getExamsExportUrl 
    ? api.getExamsExportUrl(state.currentSchoolId, term) 
    : `/api/export/exams.csv?school_id=${encodeURIComponent(state.currentSchoolId)}&term=${encodeURIComponent(term)}`;
  window.open(url, '_blank');
  showToast("Downloading Exam Merit List (UTF-8 Excel CSV)...");
}

// Add Student Modal & API Call
function openAddStudentModal() {
  document.getElementById('modalAddStudent').classList.remove('hidden');
}

function closeAddStudentModal() {
  document.getElementById('modalAddStudent').classList.add('hidden');
}

async function handleAddNewStudent(e) {
  e.preventDefault();
  const name = document.getElementById('newStuName').value;
  const father = document.getElementById('newStuFather').value;
  const cls = document.getElementById('newStuClass').value;
  const sec = document.getElementById('newStuSection').value;
  const roll = document.getElementById('newStuRoll').value;
  const phone = document.getElementById('newStuPhone').value;
  const village = document.getElementById('newStuVillage').value || "Chitral Town";
  const tuition = parseInt(document.getElementById('newStuTuition').value) || 4500;
  const discount = parseInt(document.getElementById('newStuDiscount')?.value) || 0;
  const blood = document.getElementById('newStuBlood').value;

  try {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        school_id: state.currentSchoolId,
        full_name: name,
        father_name: father,
        class_grade: cls,
        section: sec,
        roll_no: roll,
        phone: phone,
        address: village,
        monthly_fee: tuition,
        discount_amount: discount,
        blood_group: blood
      })
    });

    const data = await res.json();
    if (res.ok) {
      closeAddStudentModal();
      await loadSchoolData(state.currentSchoolId);
      showToast(data.message || `Successfully enrolled ${name} in SQLite!`);
    } else {
      showToast(data.error || "Failed to enroll student");
    }
  } catch (err) {
    showToast("Error communicating with SQLite backend");
  }
}

async function deleteStudentRecord(studentId) {
  if (!confirm("Are you sure you want to delete this student from the SQLite database?")) return;
  try {
    const res = await fetch(`/api/students/${studentId}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      await loadSchoolData(state.currentSchoolId);
      showToast(data.message || "Student removed from SQLite");
    }
  } catch (err) {
    showToast("Error deleting student");
  }
}

// ==================== SCREEN 4: STUDENT 360 PROFILE ====================
function viewStudentProfile(studentId) {
  state.currentSelectedStudentId = studentId;
  navigateTo('screen-profile');
}

function renderStudentProfile(studentId) {
  const stu = state.students.find(s => s.id === studentId) || state.students[0];
  if (!stu) return;
  state.currentSelectedStudentId = stu.id;

  const isUr = state.currentLang === 'ur';

  document.getElementById('profileAvatarLetter').innerText = stu.full_name.split(' ').map(n => n[0]).join('');
  document.getElementById('profileStudentName').innerText = isUr && stu.name_urdu ? stu.name_urdu : stu.full_name;
  document.getElementById('profileFatherName').innerText = isUr && stu.father_name_urdu ? stu.father_name_urdu : stu.father_name;
  document.getElementById('profileAdmNo').innerText = stu.admission_no;
  document.getElementById('profileRollNo').innerText = stu.roll_no;
  document.getElementById('profileVillage').innerText = stu.address || 'Chitral Town';

  // Bio Grid
  const bioGrid = document.getElementById('profileBioGrid');
  if (bioGrid) {
    bioGrid.innerHTML = `
      <div class="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
        <span class="text-slate-400 font-semibold block text-[10px]">CLASS & SECTION</span>
        <strong class="text-slate-800 dark:text-slate-200">${stu.class_grade} - ${stu.section}</strong>
      </div>
      <div class="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
        <span class="text-slate-400 font-semibold block text-[10px]">BLOOD GROUP</span>
        <strong class="text-rose-600 font-black">${stu.blood_group || 'O+'}</strong>
      </div>
      <div class="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
        <span class="text-slate-400 font-semibold block text-[10px]">GUARDIAN PHONE</span>
        <strong class="text-slate-800 dark:text-slate-200">${stu.phone}</strong>
      </div>
      <div class="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
        <span class="text-slate-400 font-semibold block text-[10px]">MONTHLY TUITION</span>
        <strong class="text-emerald-600 font-black">PKR ${Number(stu.monthly_fee).toLocaleString()}</strong>
      </div>
      <div class="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
        <span class="text-slate-400 font-semibold block text-[10px]">FEE STATUS</span>
        <strong class="${stu.fee_status === 'PAID' ? 'text-emerald-600' : 'text-rose-600'} font-black">${stu.fee_status || 'UNPAID'}</strong>
      </div>
      <div class="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
        <span class="text-slate-400 font-semibold block text-[10px]">CAMPUS</span>
        <strong class="text-slate-800 dark:text-slate-200">${state.school.name || 'Chitral'}</strong>
      </div>
    `;
  }

  // Fee Tab Table (Filtered for this student from SQLite)
  const feeTbody = document.getElementById('profileFeeTableBody');
  if (feeTbody) {
    feeTbody.innerHTML = '';
    const studentChallans = state.challans.filter(c => c.student_id === stu.id);
    if (studentChallans.length === 0) {
      feeTbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-400">No challans issued yet for this student.</td></tr>`;
    } else {
      studentChallans.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="p-3 font-semibold">${item.month_year}</td>
          <td class="p-3 font-mono text-slate-500">${item.challan_no}</td>
          <td class="p-3 font-bold">PKR ${item.total_amount.toLocaleString()}</td>
          <td class="p-3">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${item.status === 'PAID' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}">
              ${item.status}
            </span>
          </td>
          <td class="p-3 text-slate-500">${item.payment_method || 'Pending'}</td>
          <td class="p-3 text-center">
            <button onclick="printThermalReceipt('${stu.id}', '${item.challan_no}')" class="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-[10px] font-bold hover:bg-emerald-600 hover:text-white transition">
              Receipt Slip
            </button>
          </td>
        `;
        feeTbody.appendChild(tr);
      });
    }
  }

  // Exams Tab Table (From SQLite)
  const examsTbody = document.getElementById('profileExamsTableBody');
  if (examsTbody) {
    examsTbody.innerHTML = '';
    const mark = state.examMarks.find(m => m.student_id === stu.id) || {
      english: 85, urdu: 85, math: 90, science: 85, islamiat: 45, computer_or_econ: 45, percentage: 72.5, grade: 'A', remarks: 'Good'
    };

    const subjects = [
      { name: "English Compulsory", max: 100, pass: 33, obt: mark.english, remarks: "Good comprehension" },
      { name: "Urdu Literature", max: 100, pass: 33, obt: mark.urdu, remarks: "Good vocabulary" },
      { name: "Mathematics", max: 100, pass: 33, obt: mark.math, remarks: "Strong logical ability" },
      { name: "General Science", max: 100, pass: 33, obt: mark.science, remarks: "Practical lab concepts" },
      { name: "Islamiat Compulsory", max: 50, pass: 17, obt: mark.islamiat, remarks: "Quranic translation" },
      { name: "Pakistan Studies / Econ", max: 50, pass: 17, obt: mark.computer_or_econ, remarks: "Well structured" }
    ];

    subjects.forEach(sub => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="p-3 font-bold">${sub.name}</td>
        <td class="p-3 text-slate-500">${sub.max}</td>
        <td class="p-3 text-slate-500">${sub.pass}</td>
        <td class="p-3 font-extrabold text-emerald-600">${sub.obt}</td>
        <td class="p-3"><span class="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-bold text-[10px]">${mark.grade || 'A'}</span></td>
        <td class="p-3 text-slate-500 text-[11px]">${sub.remarks}</td>
      `;
      examsTbody.appendChild(tr);
    });
  }
}

function switchProfileTab(tabName) {
  const tabs = ['bio', 'attendance', 'fee', 'exams'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tabBtn${t.charAt(0).toUpperCase() + t.slice(1)}`);
    const content = document.getElementById(`profileTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (t === tabName) {
      if (btn) btn.className = "px-4 py-2.5 border-b-2 border-emerald-600 text-emerald-600 flex items-center gap-2 font-bold";
      if (content) content.classList.remove('hidden');
    } else {
      if (btn) btn.className = "px-4 py-2.5 border-b-2 border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-2 font-bold";
      if (content) content.classList.add('hidden');
    }
  });
}

// ==================== SCREEN 5: DIGITAL ID CARD WITH LIVE QR CODE ====================
function viewStudentIdCard(studentId) {
  state.currentSelectedStudentId = studentId;
  navigateTo('screen-idcard');
}

function renderIdCardScreen() {
  const selector = document.getElementById('idCardStudentSelector');
  if (selector) {
    selector.innerHTML = '';
    state.students.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.innerText = `${s.roll_no} - ${s.full_name} (${s.class_grade})`;
      if (s.id === state.currentSelectedStudentId) opt.selected = true;
      selector.appendChild(opt);
    });
  }

  renderIdCardForStudent(state.currentSelectedStudentId);
}

function renderIdCardForStudent(studentId) {
  state.currentSelectedStudentId = studentId;
  const stu = state.students.find(s => s.id === studentId) || state.students[0];
  if (!stu) return;

  const school = state.school;
  const isUr = state.currentLang === 'ur';

  document.getElementById('idCardSchoolName').innerText = isUr && school.name_urdu ? school.name_urdu : (school.name || 'Chitral Model College');
  document.getElementById('idCardStudentName').innerText = isUr && stu.name_urdu ? stu.name_urdu : stu.full_name;
  document.getElementById('idCardFatherName').innerText = `s/o ${isUr && stu.father_name_urdu ? stu.father_name_urdu : stu.father_name}`;
  document.getElementById('idCardClass').innerText = `${stu.class_grade}-${stu.section}`;
  document.getElementById('idCardRoll').innerText = stu.roll_no;
  document.getElementById('idCardAdmNo').innerText = stu.admission_no;
  document.getElementById('idCardBlood').innerText = stu.blood_group || 'O+';
  document.getElementById('idCardEmergencyPhone').innerText = stu.phone;
  document.getElementById('idCardAddressShort').innerText = stu.address || 'Chitral Town';

  // Live Scannable Mobile QR Code Generation (Encodes live LAN Wi-Fi verification URL)
  const qrContainer = document.getElementById('idCardQrContainer');
  if (qrContainer) {
    qrContainer.innerHTML = '';
    
    // Use actual LAN Wi-Fi IP so scanning with a real smartphone on the school Wi-Fi opens the official verified badge
    let host = window.location.host;
    if (state.lanIp && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      host = `${state.lanIp}:${window.location.port || '5050'}`;
    }
    const verificationUrl = `${window.location.protocol}//${host}/verify/student/${encodeURIComponent(stu.admission_no)}`;

    try {
      new QRCode(qrContainer, {
        text: verificationUrl,
        width: 110,
        height: 110,
        colorDark: "#064e3b",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });
    } catch (e) {
      console.warn("QRCode render notice:", e);
    }
  }
}

function printIdCard() {
  document.body.classList.add('printing-id-card');
  window.print();
  setTimeout(() => {
    document.body.classList.remove('printing-id-card');
  }, 1000);
}

// ==================== ANNUAL CLASS PROMOTION ====================
function openPromoteClassModal() {
  const modal = document.getElementById('modalPromoteClass');
  if (modal) modal.classList.remove('hidden');
}

function closePromoteClassModal() {
  const modal = document.getElementById('modalPromoteClass');
  if (modal) modal.classList.add('hidden');
}

async function handlePromoteClass(e) {
  e.preventDefault();
  const fromClass = document.getElementById('promoteFromClass').value;
  const toClass = document.getElementById('promoteToClass').value;

  try {
    const res = await fetch('/api/students/promote-class', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        school_id: state.currentSchoolId,
        from_class: fromClass,
        to_class: toClass
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      closePromoteClassModal();
      showToast(data.message || `Promoted students from ${fromClass} to ${toClass}!`);
      await loadSchoolData(state.currentSchoolId);
    } else {
      showToast(data.error || "Failed to promote class");
    }
  } catch (err) {
    showToast("Network error executing class promotion");
  }
}

// ==================== OFFICIAL STUDENT CERTIFICATES ====================
async function openStudentCertificateModal(studentId, certType = 'leaving') {
  const targetId = studentId || state.currentSelectedStudentId;
  try {
    const res = await fetch(`/api/students/${targetId}/certificate?type=${encodeURIComponent(certType)}`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      showToast("Certificate data not found");
      return;
    }

    const c = data.certificate;
    const modal = document.getElementById('modalStudentCertificate');
    if (!modal) return;

    document.getElementById('certModalHeaderTitle').innerText = c.certificate_title;
    document.getElementById('certDocTitle').innerText = c.certificate_title;
    document.getElementById('certSchoolName').innerText = c.school_name || 'Chitral Model College';
    document.getElementById('certBiseCode').innerText = c.bise_code;
    document.getElementById('certSchoolAddress').innerText = c.school_address || 'Chitral Town, KP';
    document.getElementById('certSerialNo').innerText = c.serial_no;
    document.getElementById('certIssueDate').innerText = c.issue_date;
    document.getElementById('certStudentName').innerText = c.student_name;
    document.getElementById('certFatherName').innerText = c.father_name;
    document.getElementById('certAdmNo').innerText = c.admission_no;
    document.getElementById('certRollNo').innerText = c.roll_no;
    document.getElementById('certClassGrade').innerText = `${c.class_grade} - ${c.section}`;
    document.getElementById('certAdmDate').innerText = c.admission_date;
    document.getElementById('certLeavingDate').innerText = c.leaving_date;
    document.getElementById('certConduct').innerText = c.conduct;
    document.getElementById('certReason').innerText = c.reason_for_leaving;
    document.getElementById('certPrincipalName').innerText = c.principal_name || 'Prof. Rehmat Ullah Baig';

    modal.classList.remove('hidden');
  } catch (err) {
    showToast("Error loading student certificate");
  }
}

function closeStudentCertModal() {
  const modal = document.getElementById('modalStudentCertificate');
  if (modal) modal.classList.add('hidden');
}

function printCertificateDoc() {
  document.body.classList.add('printing-certificate');
  window.print();
  setTimeout(() => {
    document.body.classList.remove('printing-certificate');
  }, 1000);
}

// Global window bindings
window.renderStudentsTable = renderStudentsTable;
window.filterStudents = filterStudents;
window.exportStudentsCsv = exportStudentsCsv;
window.openAddStudentModal = openAddStudentModal;
window.closeAddStudentModal = closeAddStudentModal;
window.handleAddNewStudent = handleAddNewStudent;
window.renderStudentProfile = renderStudentProfile;
window.selectStudentProfile = selectStudentProfile;
window.renderIdCardScreen = renderIdCardScreen;
window.printIdCard = printIdCard;
window.openPromoteClassModal = openPromoteClassModal;
window.closePromoteClassModal = closePromoteClassModal;
window.handlePromoteClass = handlePromoteClass;
window.openStudentCertificateModal = openStudentCertificateModal;
window.closeStudentCertModal = closeStudentCertModal;
window.printCertificateDoc = printCertificateDoc;



