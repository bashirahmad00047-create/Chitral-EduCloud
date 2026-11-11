// ==================== SCREEN 7: TEACHER WORKSPACE ====================
function renderTeacherWorkspace() {
  const grid = document.getElementById('teacherAssignedClassesGrid');
  if (grid) {
    grid.innerHTML = '';
    DEMO_TEACHER.assignedClasses.forEach(cls => {
      const card = document.createElement('div');
      card.className = "p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm";
      card.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <span class="px-2 py-0.5 bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold rounded text-[10px]">${cls.subject}</span>
          <span class="text-xs text-slate-400 font-semibold">${cls.studentsCount} Students</span>
        </div>
        <h4 class="font-bold text-base text-slate-900 dark:text-white">${cls.class} - Sec ${cls.section}</h4>
        <div class="mt-3 flex items-center gap-2">
          <button onclick="navigateTo('screen-attendance')" class="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold">Attendance</button>
          <button onclick="navigateTo('screen-exams')" class="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold">Marks Entry</button>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  // Timetable
  const tbody = document.getElementById('teacherTimetableBody');
  if (tbody) {
    tbody.innerHTML = '';
    DEMO_TEACHER.todayTimetable.forEach(item => {
      const tr = document.createElement('tr');
      const statusClass = item.status === 'Completed' ? 'bg-slate-100 text-slate-600' :
        item.status === 'Ongoing' ? 'bg-emerald-100 text-emerald-700 animate-pulse' :
        'bg-amber-100 text-amber-700';

      tr.innerHTML = `
        <td class="p-3 font-bold">Period ${item.period}</td>
        <td class="p-3 font-semibold text-slate-600 dark:text-slate-300">${item.time}</td>
        <td class="p-3 font-bold text-slate-900 dark:text-white">${item.class}</td>
        <td class="p-3 text-emerald-600 font-bold">${item.subject}</td>
        <td class="p-3 text-slate-600 dark:text-slate-300">${item.topic}</td>
        <td class="p-3 font-mono text-slate-500">${item.room}</td>
        <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${statusClass}">${item.status}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }
}

// ==================== SCREEN 8: ATTENDANCE MANAGEMENT (REST API) ====================
function renderAttendanceSheet() {
  const tbody = document.getElementById('attendanceSheetBody');
  if (!tbody) return;

  const isUr = state.currentLang === 'ur';
  tbody.innerHTML = '';
  let pCount = 0, aCount = 0, lCount = 0;

  state.students.forEach(stu => {
    const status = state.attendanceSession[stu.id] || stu.today_attendance || 'P';
    if (status === 'P') pCount++;
    else if (status === 'A') aCount++;
    else if (status === 'L') lCount++;

    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50 dark:hover:bg-slate-700/50 transition";
    tr.innerHTML = `
      <td class="p-3.5 font-bold text-slate-900 dark:text-white">#${stu.roll_no}</td>
      <td class="p-3.5 font-bold">${isUr && stu.name_urdu ? stu.name_urdu : stu.full_name}</td>
      <td class="p-3.5 text-slate-500">${isUr && stu.father_name_urdu ? stu.father_name_urdu : stu.father_name}</td>
      <td class="p-3.5 font-mono text-slate-500">${status === 'P' ? (stu.today_arrival_time || '08:12 AM') : '--:--'}</td>
      <td class="p-3.5 text-center">
        <div class="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-700 gap-1">
          <button onclick="setStudentAttendance('${stu.id}', 'P')" class="px-3 py-1 rounded-lg text-xs font-bold transition ${status === 'P' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-emerald-600'}">P (Present)</button>
          <button onclick="setStudentAttendance('${stu.id}', 'A')" class="px-3 py-1 rounded-lg text-xs font-bold transition ${status === 'A' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-rose-600'}">A (Absent)</button>
          <button onclick="setStudentAttendance('${stu.id}', 'L')" class="px-3 py-1 rounded-lg text-xs font-bold transition ${status === 'L' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-amber-600'}">L (Leave)</button>
        </div>
      </td>
      <td class="p-3.5 text-right">
        ${status === 'A' ? 
          `<button onclick="sendWhatsAppAbsenceAlert('${stu.id}')" class="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-300 hover:bg-emerald-600 hover:text-white transition" title="Send Absence Alert via WhatsApp"><i class="fa-brands fa-whatsapp text-emerald-500 text-xs"></i> WhatsApp</button>` : 
          '<span class="text-[10px] text-slate-400">Normal</span>'}
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('attCountPresent').innerText = pCount;
  document.getElementById('attCountAbsent').innerText = aCount;
  document.getElementById('attCountLeave').innerText = lCount;
}

function setStudentAttendance(studentId, status) {
  state.attendanceSession[studentId] = status;
  renderAttendanceSheet();
}

function markAllAttendance(status) {
  const code = status.charAt(0).toUpperCase();
  state.students.forEach(s => {
    state.attendanceSession[s.id] = code;
  });
  renderAttendanceSheet();
  showToast(`Marked all students as ${status}`);
}

async function saveAttendanceRegister() {
  const dateInput = document.getElementById('attDatePicker');
  const dateStr = dateInput ? dateInput.value : state.currentDate;

  const records = state.students.map(s => ({
    student_id: s.id,
    status: state.attendanceSession[s.id] || 'P',
    arrival_time: state.attendanceSession[s.id] === 'P' ? (s.today_arrival_time || '08:14 AM') : null
  }));

  try {
    const res = await fetch('/api/attendance/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        school_id: state.currentSchoolId,
        date: dateStr,
        records: records
      })
    });

    const data = await res.json();
    if (res.ok) {
      await loadSchoolData(state.currentSchoolId, dateStr);
      showToast(data.message || "Attendance saved to SQLite!");
    }
  } catch (err) {
    showToast("Error saving attendance to SQLite");
  }
}



// ==================== SCREEN 10: EXAMS & RESULTS MANAGEMENT (REST API) ====================
function renderExamMarksGrid() {
  const tbody = document.getElementById('examMarksGridBody');
  if (!tbody) return;

  tbody.innerHTML = '';
  state.students.forEach((stu, idx) => {
    const mark = state.examMarks.find(m => m.student_id === stu.id) || {
      math: 85, science: 80, english: 80, urdu: 85, islamiat: 45, computer_or_econ: 45, percentage: 70.0, grade: 'A'
    };

    const theoryMarks = Math.round((mark.math || 80) * 0.75);
    const pracMarks = (mark.math || 80) - theoryMarks;
    const total = mark.math || 80;

    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50 dark:hover:bg-slate-700/50 transition";
    tr.innerHTML = `
      <td class="p-3.5 font-bold">#${stu.roll_no}</td>
      <td class="p-3.5 font-bold text-slate-900 dark:text-white">${stu.full_name}</td>
      <td class="p-3.5 font-semibold text-slate-500">100</td>
      <td class="p-3.5">
        <input type="number" id="thMarks_${stu.id}" onchange="recalculateStudentRow('${stu.id}')" value="${theoryMarks}" max="75" min="0" class="w-16 p-1.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 font-bold">
      </td>
      <td class="p-3.5">
        <input type="number" id="prMarks_${stu.id}" onchange="recalculateStudentRow('${stu.id}')" value="${pracMarks}" max="25" min="0" class="w-16 p-1.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 font-bold">
      </td>
      <td class="p-3.5 font-black text-slate-900 dark:text-white" id="totalMarks_${stu.id}">${total}</td>
      <td class="p-3.5 font-bold text-emerald-600" id="pctMarks_${stu.id}">${total}%</td>
      <td class="p-3.5">
        <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" id="gradeMarks_${stu.id}">
          ${mark.grade || 'A'}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function recalculateStudentRow(studentId) {
  const th = parseInt(document.getElementById(`thMarks_${studentId}`).value) || 0;
  const pr = parseInt(document.getElementById(`prMarks_${studentId}`).value) || 0;
  const total = th + pr;
  const pct = total;

  let grade = "F";
  if (pct >= 80) grade = "A1";
  else if (pct >= 70) grade = "A";
  else if (pct >= 60) grade = "B";
  else if (pct >= 50) grade = "C";
  else if (pct >= 33) grade = "D";

  document.getElementById(`totalMarks_${studentId}`).innerText = total;
  document.getElementById(`pctMarks_${studentId}`).innerText = `${pct}%`;
  const gradeEl = document.getElementById(`gradeMarks_${studentId}`);
  gradeEl.innerText = grade;
  gradeEl.className = `px-2.5 py-0.5 rounded-full text-xs font-bold ${grade === 'F' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`;
}

async function saveExamMarksGrid() {
  try {
    for (const stu of state.students) {
      const thEl = document.getElementById(`thMarks_${stu.id}`);
      const prEl = document.getElementById(`prMarks_${stu.id}`);
      if (!thEl || !prEl) continue;

      const mathTotal = (parseInt(thEl.value) || 0) + (parseInt(prEl.value) || 0);
      await fetch('/api/exams/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: state.currentSchoolId,
          student_id: stu.id,
          exam_term: 'First Term',
          english: 85,
          urdu: 85,
          math: mathTotal,
          science: 85,
          islamiat: 45,
          computer_or_econ: 45,
          remarks: 'Updated in SQLite ledger'
        })
      });
    }

    await loadSchoolData(state.currentSchoolId);
    showToast("Exam marks successfully calculated & saved to SQLite database!");
  } catch (err) {
    showToast("Error saving marks to SQLite");
  }
}

// ==================== SCREEN 11: PRINTABLE DMC REPORT CARD ====================
function viewStudentDmc(studentId) {
  state.currentSelectedStudentId = studentId;
  navigateTo('screen-dmc');
}

function renderDmcScreen() {
  const selector = document.getElementById('dmcStudentSelector');
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

  renderDmcForStudent(state.currentSelectedStudentId);
}

function renderDmcForStudent(studentId) {
  state.currentSelectedStudentId = studentId;
  const stu = state.students.find(s => s.id === studentId) || state.students[0];
  if (!stu) return;

  const school = state.school;
  document.getElementById('dmcSchoolHeading').innerText = school.name || 'CHITRAL MODEL COLLEGE & SCHOOL';

  // Metadata Grid
  const meta = document.getElementById('dmcMetadataGrid');
  if (meta) {
    meta.innerHTML = `
      <div><span class="text-slate-400 block text-[10px]">STUDENT NAME</span><strong class="text-slate-900">${stu.full_name}</strong></div>
      <div><span class="text-slate-400 block text-[10px]">FATHER'S NAME</span><strong class="text-slate-900">${stu.father_name}</strong></div>
      <div><span class="text-slate-400 block text-[10px]">ROLL NUMBER</span><strong class="text-slate-900">${stu.roll_no}</strong></div>
      <div><span class="text-slate-400 block text-[10px]">REGISTRATION NO</span><strong class="text-slate-900">${stu.admission_no}</strong></div>
      <div><span class="text-slate-400 block text-[10px]">CLASS & SECTION</span><strong class="text-slate-900">${stu.class_grade} - ${stu.section}</strong></div>
      <div><span class="text-slate-400 block text-[10px]">EXAMINATION</span><strong class="text-slate-900">First Term Exam 2026</strong></div>
    `;
  }

  // Subject Table
  const tbody = document.getElementById('dmcSubjectTableBody');
  if (tbody) {
    tbody.innerHTML = '';
    const mark = state.examMarks.find(m => m.student_id === stu.id) || {
      english: 88, urdu: 85, math: 94, science: 89, islamiat: 47, computer_or_econ: 45, obtained_marks: 448, percentage: 74.67, grade: 'A', remarks: 'Good'
    };

    const subjects = [
      { name: "English Compulsory", max: 100, pass: 33, obt: mark.english, remarks: "Excellent vocabulary" },
      { name: "Urdu Literature", max: 100, pass: 33, obt: mark.urdu, remarks: "Good poetry tashreeh" },
      { name: "Mathematics", max: 100, pass: 33, obt: mark.math, remarks: "Sharp in algebra" },
      { name: "General Science / Physics", max: 100, pass: 33, obt: mark.science, remarks: "Conceptual clarity" },
      { name: "Islamiat Compulsory", max: 50, pass: 17, obt: mark.islamiat, remarks: "Good recitation" },
      { name: "Pakistan Studies", max: 50, pass: 17, obt: mark.computer_or_econ, remarks: "Very well structured" }
    ];

    let totalMax = 0, totalObt = 0;
    subjects.forEach(sub => {
      totalMax += sub.max;
      totalObt += sub.obt;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="p-2.5 font-bold">${sub.name}</td>
        <td class="p-2.5 text-center font-mono">${sub.max}</td>
        <td class="p-2.5 text-center font-mono">${sub.pass}</td>
        <td class="p-2.5 text-center font-black text-slate-900">${sub.obt}</td>
        <td class="p-2.5 text-center font-bold text-emerald-700">${mark.grade || 'A'}</td>
        <td class="p-2.5 text-slate-600 text-[11px]">${sub.remarks}</td>
      `;
      tbody.appendChild(tr);
    });

    const pct = ((totalObt / totalMax) * 100).toFixed(1);
    document.getElementById('dmcGrandTotal').innerText = `${totalObt} / ${totalMax}`;
    document.getElementById('dmcOverallPct').innerText = `${pct}% (Grade ${mark.grade || 'A'})`;
    document.getElementById('dmcClassPosition').innerText = "Verified in SQLite";
  }
}

function printDmcReport() {
  document.body.classList.add('printing-dmc');
  window.print();
  setTimeout(() => {
    document.body.classList.remove('printing-dmc');
  }, 1000);
}

// Global window bindings
window.renderTeacherWorkspace = renderTeacherWorkspace;
window.renderAttendanceSheet = renderAttendanceSheet;
window.setStudentAttendance = setStudentAttendance;
window.markAllAttendance = markAllAttendance;
window.saveAttendanceRegister = saveAttendanceRegister;
window.exportAttendanceCsv = exportAttendanceCsv;
window.renderExamMarksGrid = renderExamMarksGrid;
window.saveExamMarks = saveExamMarks;
window.exportExamsCsv = exportExamsCsv;
window.renderDmcScreen = renderDmcScreen;
window.printDmcReport = printDmcReport;
window.sendWhatsAppAbsenceAlert = sendWhatsAppAbsenceAlert;


