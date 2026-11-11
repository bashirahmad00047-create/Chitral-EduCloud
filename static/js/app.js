// Chitral EduCloud ERP - Master Interactive Application Engine

let state = {
  currentRole: 'admin',
  currentLang: 'en',
  currentSchoolId: 'chitral-model',
  currentScreen: 'screen-dashboard',
  currentSelectedStudentId: 'STU-1001',
  students: JSON.parse(JSON.stringify(DEMO_STUDENTS)),
  schools: JSON.parse(JSON.stringify(DEMO_SCHOOLS)),
  attendanceSession: {},
  broadcastLogs: [
    { time: "Yesterday, 04:30 PM", title: "PTM Invitation", audience: "All Parents", channel: "WhatsApp", status: "Delivered (684/684)" },
    { time: "08 Oct 2026, 09:00 AM", title: "Monthly Fee Challan Due", audience: "Fee Defaulters", channel: "SMS", status: "Delivered (42/42)" }
  ],
  charts: {
    feeChart: null,
    attendanceChart: null
  }
};

// DOM Content Loaded Kickoff
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSchoolTenants();
  initNavigation();
  initAttendanceSession();
  renderScreen(state.currentScreen);
  applyTranslations();
  initCharts();
});

// ==================== THEME MANAGEMENT ====================
function initTheme() {
  const savedTheme = localStorage.getItem('chitral_educloud_theme') || 'light';
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
    document.getElementById('themeIcon').classList.replace('fa-moon', 'fa-sun');
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('chitral_educloud_theme', isDark ? 'dark' : 'light');
  const icon = document.getElementById('themeIcon');
  if (isDark) {
    icon.classList.replace('fa-moon', 'fa-sun');
  } else {
    icon.classList.replace('fa-sun', 'fa-moon');
  }
  if (state.charts.feeChart) {
    state.charts.feeChart.destroy();
    state.charts.attendanceChart.destroy();
    initCharts();
  }
}

// ==================== LANGUAGE & RTL TOGGLE ====================
function toggleLanguage() {
  state.currentLang = state.currentLang === 'en' ? 'ur' : 'en';
  const html = document.documentElement;
  const langLabel = document.getElementById('langLabel');

  if (state.currentLang === 'ur') {
    html.setAttribute('dir', 'rtl');
    html.setAttribute('lang', 'ur');
    langLabel.innerText = "English (LTR)";
  } else {
    html.setAttribute('dir', 'ltr');
    html.setAttribute('lang', 'en');
    langLabel.innerText = "اردو (RTL)";
  }

  applyTranslations();
  renderScreen(state.currentScreen);
  showToast(state.currentLang === 'ur' ? "اردو زبان فعال ہو گئی ہے" : "Language switched to English");
}

function applyTranslations() {
  const t = TRANSLATIONS[state.currentLang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) {
      el.innerText = t[key];
    }
  });
}

// ==================== SCHOOL TENANT MANAGEMENT ====================
function initSchoolTenants() {
  const select = document.getElementById('schoolTenantSelect');
  const loginCards = document.getElementById('loginSchoolTenantCards');
  
  select.innerHTML = '';
  loginCards.innerHTML = '';

  state.schools.forEach(school => {
    // Top Select
    const opt = document.createElement('option');
    opt.value = school.id;
    opt.innerText = school.name;
    if (school.id === state.currentSchoolId) opt.selected = true;
    select.appendChild(opt);

    // Login Cards
    const card = document.createElement('div');
    card.className = `p-4 rounded-2xl border-2 transition cursor-pointer ${school.id === state.currentSchoolId ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40' : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 bg-white dark:bg-slate-800'}`;
    card.onclick = () => switchSchool(school.id);
    card.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-sm">
          ${school.logoText}
        </div>
        <div>
          <h4 class="font-bold text-xs text-slate-900 dark:text-white leading-tight">${state.currentLang === 'ur' ? school.nameUrdu : school.name}</h4>
          <p class="text-[10px] text-slate-500 mt-0.5">${state.currentLang === 'ur' ? school.campusUrdu : school.campus}</p>
        </div>
      </div>
    `;
    loginCards.appendChild(card);
  });

  select.addEventListener('change', (e) => {
    switchSchool(e.target.value);
  });

  updateSchoolHeaderUI();
}

function switchSchool(schoolId) {
  state.currentSchoolId = schoolId;
  const select = document.getElementById('schoolTenantSelect');
  if (select) select.value = schoolId;
  
  updateSchoolHeaderUI();
  initSchoolTenants();
  renderScreen(state.currentScreen);
  
  const currentSchool = getActiveSchool();
  showToast(`Switched campus: ${currentSchool.name}`);
}

function getActiveSchool() {
  return state.schools.find(s => s.id === state.currentSchoolId) || state.schools[0];
}

function updateSchoolHeaderUI() {
  const school = getActiveSchool();
  const isUr = state.currentLang === 'ur';

  // Dashboard Headings
  const dashSchoolHeading = document.getElementById('dashSchoolHeading');
  if (dashSchoolHeading) dashSchoolHeading.innerText = isUr ? school.nameUrdu : school.name;

  const quickBoxSchoolName = document.getElementById('quickBoxSchoolName');
  if (quickBoxSchoolName) quickBoxSchoolName.innerText = isUr ? school.nameUrdu : school.name;

  const quickBoxCampusAddress = document.getElementById('quickBoxCampusAddress');
  if (quickBoxCampusAddress) quickBoxCampusAddress.innerText = isUr ? school.campusUrdu : school.campus;

  const quickBoxAffiliation = document.getElementById('quickBoxAffiliation');
  if (quickBoxAffiliation) quickBoxAffiliation.innerText = school.biseAffiliation;

  const quickBoxPrincipal = document.getElementById('quickBoxPrincipal');
  if (quickBoxPrincipal) quickBoxPrincipal.innerText = school.principal;

  const quickBoxPhone = document.getElementById('quickBoxPhone');
  if (quickBoxPhone) quickBoxPhone.innerText = school.phone;

  // Settings inputs
  const cfgSchoolName = document.getElementById('cfgSchoolName');
  if (cfgSchoolName) cfgSchoolName.value = school.name;

  const cfgCampusAddress = document.getElementById('cfgCampusAddress');
  if (cfgCampusAddress) cfgCampusAddress.value = school.campus;

  const cfgBiseCode = document.getElementById('cfgBiseCode');
  if (cfgBiseCode) cfgBiseCode.value = school.biseAffiliation;

  const cfgSchoolPhone = document.getElementById('cfgSchoolPhone');
  if (cfgSchoolPhone) cfgSchoolPhone.value = school.phone;

  const cfgSchoolEmail = document.getElementById('cfgSchoolEmail');
  if (cfgSchoolEmail) cfgSchoolEmail.value = school.email;
}

// ==================== ROLE SWITCHER ====================
function setRole(role) {
  state.currentRole = role;

  const roles = ['admin', 'teacher', 'parent'];
  roles.forEach(r => {
    const btn = document.getElementById(`roleBtn${r.charAt(0).toUpperCase() + r.slice(1)}`);
    if (btn) {
      if (r === role) {
        btn.className = "px-2.5 py-1 rounded-md transition-all active-role-pill bg-white dark:bg-emerald-600 text-emerald-700 dark:text-white shadow-xs font-bold";
      } else {
        btn.className = "px-2.5 py-1 rounded-md transition-all text-slate-600 dark:text-slate-300 hover:text-emerald-600 font-semibold";
      }
    }
  });

  const avatar = document.getElementById('userAvatarText');
  const name = document.getElementById('userNameText');
  const roleText = document.getElementById('userRoleText');

  if (role === 'admin') {
    avatar.innerText = "AD";
    name.innerText = "Admin Rehmat";
    roleText.innerText = "Principal Desk";
    navigateTo('screen-dashboard');
  } else if (role === 'teacher') {
    avatar.innerText = "FA";
    name.innerText = "Sir Farooq Azam";
    roleText.innerText = "Faculty Specialist";
    navigateTo('screen-teacher');
  } else if (role === 'parent') {
    avatar.innerText = "MW";
    name.innerText = "Mir Wazir Khan";
    roleText.innerText = "Guardian Portal";
    navigateTo('screen-parent');
  }

  showToast(`Active role: ${role.toUpperCase()}`);
}

function loginAsRole(role) {
  setRole(role);
}

// ==================== NAVIGATION ROUTER ====================
function initNavigation() {
  const sidebarBtn = document.getElementById('sidebarToggleBtn');
  if (sidebarBtn) {
    sidebarBtn.addEventListener('click', toggleMobileSidebar);
  }
}

function toggleMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  sidebar.classList.toggle('-translate-x-full');
  backdrop.classList.toggle('hidden');
}

function navigateTo(screenId) {
  state.currentScreen = screenId;

  // Hide all screens
  document.querySelectorAll('.screen-view').forEach(el => {
    el.classList.add('hidden');
  });

  // Show target screen
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.remove('hidden');
  }

  // Update active sidebar nav button
  document.querySelectorAll('.nav-item').forEach(btn => {
    if (btn.getAttribute('data-screen') === screenId) {
      btn.classList.add('bg-emerald-50', 'dark:bg-slate-700', 'text-emerald-700', 'dark:text-emerald-400');
    } else {
      btn.classList.remove('bg-emerald-50', 'dark:bg-slate-700', 'text-emerald-700', 'dark:text-emerald-400');
    }
  });

  // Close mobile sidebar if open
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (sidebar && !sidebar.classList.contains('-translate-x-full') && window.innerWidth < 1024) {
    sidebar.classList.add('-translate-x-full');
    backdrop.classList.add('hidden');
  }

  renderScreen(screenId);
  applyTranslations();

  // Scroll to top of main content
  const mainContent = document.getElementById('mainContent');
  if (mainContent) mainContent.scrollTop = 0;
}

function renderScreen(screenId) {
  switch (screenId) {
    case 'screen-dashboard':
      renderAdminDashboard();
      break;
    case 'screen-students':
      renderStudentsTable();
      break;
    case 'screen-profile':
      renderStudentProfile(state.currentSelectedStudentId);
      break;
    case 'screen-idcard':
      renderIdCardScreen();
      break;
    case 'screen-parent':
      renderParentPortal();
      break;
    case 'screen-teacher':
      renderTeacherWorkspace();
      break;
    case 'screen-attendance':
      renderAttendanceSheet();
      break;
    case 'screen-fees':
      renderFeeManagement();
      break;
    case 'screen-exams':
      renderExamMarksGrid();
      break;
    case 'screen-dmc':
      renderDmcScreen();
      break;
    case 'screen-alerts':
      renderAlertsHub();
      break;
    case 'screen-settings':
      updateSchoolHeaderUI();
      break;
  }
}

// ==================== SCREEN 2: ADMIN DASHBOARD ====================
function renderAdminDashboard() {
  const school = getActiveSchool();
  const stats = school.stats;

  document.getElementById('kpiValTotalStudents').innerText = stats.totalStudents;
  document.getElementById('kpiValBoys').innerText = stats.boys;
  document.getElementById('kpiValGirls').innerText = stats.girls;
  document.getElementById('kpiValAttendancePct').innerText = `${stats.todayAttendancePct}%`;
  document.getElementById('kpiValPresent').innerText = stats.presentToday;
  document.getElementById('kpiValAbsent').innerText = stats.absentToday;
  document.getElementById('kpiValLeave').innerText = stats.leaveToday;
  document.getElementById('kpiValFeeCollected').innerText = `PKR ${stats.monthlyFeeCollected.toLocaleString()}`;
  document.getElementById('kpiValPendingDues').innerText = `PKR ${stats.totalPendingDues.toLocaleString()}`;
  document.getElementById('kpiValDefaulters').innerText = stats.defaulterCount;
  
  const pctProgress = ((stats.monthlyFeeCollected / stats.monthlyFeeTarget) * 100).toFixed(1);
  document.getElementById('kpiValFeeTargetProgress').innerText = `${pctProgress}%`;

  // Activity Feed
  const feed = document.getElementById('adminActivityFeed');
  if (feed) {
    feed.innerHTML = `
      <div class="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700 text-xs">
        <div class="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
          <i class="fa-solid fa-receipt"></i>
        </div>
        <div class="flex-1">
          <p class="font-bold text-slate-800 dark:text-slate-200">Fee Received: PKR 4,500 from Aliyan Ali (Grade 10-A)</p>
          <p class="text-[10px] text-slate-400">Via JazzCash &middot; Challan #CH-2026-1049 &middot; 10 mins ago</p>
        </div>
        <span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">Verified</span>
      </div>
      <div class="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700 text-xs">
        <div class="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-600 flex items-center justify-center font-bold">
          <i class="fa-solid fa-clipboard-check"></i>
        </div>
        <div class="flex-1">
          <p class="font-bold text-slate-800 dark:text-slate-200">Attendance Locked: Grade 10-A (36 Present, 2 Absent)</p>
          <p class="text-[10px] text-slate-400">Submitted by Sir Farooq Azam &middot; 08:35 AM</p>
        </div>
        <span class="text-[10px] font-bold text-teal-600 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded">Completed</span>
      </div>
      <div class="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700 text-xs">
        <div class="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold">
          <i class="fa-solid fa-bullhorn"></i>
        </div>
        <div class="flex-1">
          <p class="font-bold text-slate-800 dark:text-slate-200">WhatsApp Alert Broadcasted: Lowari Tunnel Snowfall Notice</p>
          <p class="text-[10px] text-slate-400">Delivered to 684 Parents across Chitral &middot; Yesterday</p>
        </div>
        <span class="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded">Delivered</span>
      </div>
    `;
  }
}

// Chart.js initialization
function initCharts() {
  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#334155' : '#f1f5f9';

  // Fee Collection Bar Chart
  const feeCanvas = document.getElementById('feeCollectionChart');
  if (feeCanvas) {
    const ctx = feeCanvas.getContext('2d');
    state.charts.feeChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct (Target)'],
        datasets: [
          {
            label: 'Collected (PKR)',
            data: [1820000, 1750000, 1890000, 1940000, 1915200, 2394000],
            backgroundColor: '#059669',
            borderRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            ticks: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 10 } },
            grid: { display: false }
          },
          y: {
            ticks: {
              color: textColor,
              font: { family: 'Plus Jakarta Sans', size: 10 },
              callback: (val) => `${val / 1000000}M`
            },
            grid: { color: gridColor }
          }
        }
      }
    });
  }

  // Attendance Breakdown Polar/Doughnut Chart
  const attCanvas = document.getElementById('attendanceBreakdownChart');
  if (attCanvas) {
    const ctx = attCanvas.getContext('2d');
    state.charts.attendanceChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Grade 10', 'Grade 9', 'FSc-I PreMed', 'Grade 8'],
        datasets: [
          {
            data: [96.2, 94.5, 97.1, 93.0],
            backgroundColor: ['#059669', '#0d9488', '#6366f1', '#f59e0b'],
            borderWidth: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 10 } }
          }
        },
        cutout: '70%'
      }
    });
  }
}

// ==================== SCREEN 3: STUDENT SIS ====================
function renderStudentsTable(filterText = '', classFilter = 'All', feeFilter = 'All') {
  const tbody = document.getElementById('studentTableBody');
  if (!tbody) return;

  const isUr = state.currentLang === 'ur';
  let filtered = state.students.filter(s => s.schoolId === state.currentSchoolId);

  if (classFilter !== 'All') {
    filtered = filtered.filter(s => s.class === classFilter);
  }

  if (feeFilter !== 'All') {
    filtered = filtered.filter(s => s.feeStatus === feeFilter);
  }

  if (filterText.trim()) {
    const query = filterText.toLowerCase();
    filtered = filtered.filter(s => 
      s.name.toLowerCase().includes(query) ||
      (s.nameUrdu && s.nameUrdu.includes(query)) ||
      s.rollNo.includes(query) ||
      s.admissionNo.toLowerCase().includes(query) ||
      s.guardianPhone.includes(query) ||
      s.village.toLowerCase().includes(query)
    );
  }

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400">No students found matching current filters.</td></tr>`;
    document.getElementById('studentTableCounter').innerText = "Showing 0 students";
    return;
  }

  document.getElementById('studentTableCounter').innerText = `Showing ${filtered.length} of ${state.students.length} Students`;

  filtered.forEach(stu => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition border-b border-slate-100 dark:border-slate-700";

    const feeBadgeClass = stu.feeStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
      stu.feeStatus === 'Pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
      'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';

    tr.innerHTML = `
      <td class="p-3.5">
        <span class="font-extrabold text-slate-900 dark:text-white">#${stu.rollNo}</span>
        <span class="block text-[10px] text-slate-400">${stu.admissionNo}</span>
      </td>
      <td class="p-3.5 font-bold text-slate-800 dark:text-slate-100">
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
            ${stu.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <span>${isUr && stu.nameUrdu ? stu.nameUrdu : stu.name}</span>
            <span class="block text-[10px] text-slate-400 font-normal">${stu.gender} &middot; B-Form: ${stu.bForm}</span>
          </div>
        </div>
      </td>
      <td class="p-3.5">
        <span class="font-semibold text-slate-700 dark:text-slate-300">${isUr && stu.fatherNameUrdu ? stu.fatherNameUrdu : stu.fatherName}</span>
        <span class="block text-[10px] text-slate-400"><i class="fa-solid fa-phone text-[9px] mr-1"></i>${stu.guardianPhone}</span>
      </td>
      <td class="p-3.5 font-semibold text-slate-700 dark:text-slate-300">${stu.class} - ${stu.section}</td>
      <td class="p-3.5 text-slate-500 text-[11px]"><i class="fa-solid fa-location-dot text-emerald-600 text-[10px] mr-1"></i>${isUr && stu.villageUrdu ? stu.villageUrdu : stu.village}</td>
      <td class="p-3.5">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${feeBadgeClass}">
          ${stu.feeStatus}
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
  const school = getActiveSchool();
  let csv = "RollNo,AdmissionNo,Name,FatherName,Class,Section,Village,Phone,FeeStatus,MonthlyFeePKR\n";
  state.students.filter(s => s.schoolId === state.currentSchoolId).forEach(s => {
    csv += `"${s.rollNo}","${s.admissionNo}","${s.name}","${s.fatherName}","${s.class}","${s.section}","${s.village}","${s.guardianPhone}","${s.feeStatus}","${s.monthlyTuition}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${school.id}_students_roster_2026.csv`;
  a.click();
  showToast("Exported Student CSV roster successfully");
}

// Add Student Modal
function openAddStudentModal() {
  document.getElementById('modalAddStudent').classList.remove('hidden');
}

function closeAddStudentModal() {
  document.getElementById('modalAddStudent').classList.add('hidden');
}

function handleAddNewStudent(e) {
  e.preventDefault();
  const name = document.getElementById('newStuName').value;
  const father = document.getElementById('newStuFather').value;
  const cls = document.getElementById('newStuClass').value;
  const sec = document.getElementById('newStuSection').value;
  const roll = document.getElementById('newStuRoll').value;
  const phone = document.getElementById('newStuPhone').value;
  const village = document.getElementById('newStuVillage').value || "Chitral Town";
  const tuition = parseInt(document.getElementById('newStuTuition').value) || 4500;
  const blood = document.getElementById('newStuBlood').value;

  const newStu = {
    id: `STU-${Date.now().toString().slice(-4)}`,
    schoolId: state.currentSchoolId,
    rollNo: roll,
    admissionNo: `CMC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    name: name,
    nameUrdu: name,
    fatherName: father,
    fatherNameUrdu: father,
    gender: "Male",
    class: cls,
    section: sec,
    bForm: "15801-XXXXXXX-X",
    dob: "2010-01-01",
    bloodGroup: blood,
    village: village,
    villageUrdu: village,
    guardianPhone: phone,
    guardianCnic: "15801-XXXXXXX-X",
    guardianOccupation: "Guardian",
    emergencyContact: phone,
    admissionDate: "2026-10-12",
    status: "Active",
    feeStatus: "Pending",
    monthlyTuition: tuition,
    arrears: tuition,
    currentChallanNo: `CH-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    overallAttendance: 100,
    todayAttendance: "Present",
    todayArrivalTime: "08:15 AM",
    examPosition: "Newly Enrolled",
    subjects: [
      { name: "English Compulsory", maxMarks: 100, passMarks: 33, obtainedMarks: 80, grade: "A", remarks: "Good" },
      { name: "Urdu Literature", maxMarks: 100, passMarks: 33, obtainedMarks: 80, grade: "A", remarks: "Good" },
      { name: "Mathematics", maxMarks: 100, passMarks: 33, obtainedMarks: 85, grade: "A+", remarks: "Very Good" }
    ],
    feeLedger: [
      { month: "October 2026", challanNo: `CH-2026-${Math.floor(1000 + Math.random() * 9000)}`, amount: tuition, status: "Pending", dueDate: "2026-10-15", mode: "Pending" }
    ]
  };

  state.students.unshift(newStu);
  closeAddStudentModal();
  renderStudentsTable();
  showToast(`Successfully enrolled ${name} (Roll #${roll})`);
}

// ==================== SCREEN 4: STUDENT 360 PROFILE ====================
function viewStudentProfile(studentId) {
  state.currentSelectedStudentId = studentId;
  navigateTo('screen-profile');
}

function renderStudentProfile(studentId) {
  const stu = state.students.find(s => s.id === studentId) || state.students[0];
  state.currentSelectedStudentId = stu.id;

  const isUr = state.currentLang === 'ur';

  document.getElementById('profileAvatarLetter').innerText = stu.name.split(' ').map(n => n[0]).join('');
  document.getElementById('profileStudentName').innerText = isUr && stu.nameUrdu ? stu.nameUrdu : stu.name;
  document.getElementById('profileFatherName').innerText = isUr && stu.fatherNameUrdu ? stu.fatherNameUrdu : stu.fatherName;
  document.getElementById('profileAdmNo').innerText = stu.admissionNo;
  document.getElementById('profileRollNo').innerText = stu.rollNo;
  document.getElementById('profileVillage').innerText = isUr && stu.villageUrdu ? stu.villageUrdu : stu.village;

  // Bio Grid
  const bioGrid = document.getElementById('profileBioGrid');
  if (bioGrid) {
    bioGrid.innerHTML = `
      <div class="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
        <span class="text-slate-400 font-semibold block text-[10px]">CLASS & SECTION</span>
        <strong class="text-slate-800 dark:text-slate-200">${stu.class} - ${stu.section}</strong>
      </div>
      <div class="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
        <span class="text-slate-400 font-semibold block text-[10px]">B-FORM / CNIC</span>
        <strong class="text-slate-800 dark:text-slate-200">${stu.bForm}</strong>
      </div>
      <div class="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
        <span class="text-slate-400 font-semibold block text-[10px]">DATE OF BIRTH</span>
        <strong class="text-slate-800 dark:text-slate-200">${stu.dob}</strong>
      </div>
      <div class="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
        <span class="text-slate-400 font-semibold block text-[10px]">BLOOD GROUP</span>
        <strong class="text-rose-600 font-black">${stu.bloodGroup}</strong>
      </div>
      <div class="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
        <span class="text-slate-400 font-semibold block text-[10px]">GUARDIAN PHONE</span>
        <strong class="text-slate-800 dark:text-slate-200">${stu.guardianPhone}</strong>
      </div>
      <div class="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
        <span class="text-slate-400 font-semibold block text-[10px]">EMERGENCY CONTACT</span>
        <strong class="text-rose-600 font-bold">${stu.emergencyContact}</strong>
      </div>
      <div class="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
        <span class="text-slate-400 font-semibold block text-[10px]">GUARDIAN PROFESSION</span>
        <strong class="text-slate-800 dark:text-slate-200">${stu.guardianOccupation}</strong>
      </div>
      <div class="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
        <span class="text-slate-400 font-semibold block text-[10px]">ADMISSION DATE</span>
        <strong class="text-slate-800 dark:text-slate-200">${stu.admissionDate}</strong>
      </div>
      <div class="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
        <span class="text-slate-400 font-semibold block text-[10px]">MONTHLY TUITION</span>
        <strong class="text-emerald-600 font-black">PKR ${stu.monthlyTuition.toLocaleString()}</strong>
      </div>
    `;
  }

  // Fee Tab Table
  const feeTbody = document.getElementById('profileFeeTableBody');
  if (feeTbody) {
    feeTbody.innerHTML = '';
    stu.feeLedger.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="p-3 font-semibold">${item.month}</td>
        <td class="p-3 font-mono text-slate-500">${item.challanNo}</td>
        <td class="p-3 font-bold">PKR ${item.amount.toLocaleString()}</td>
        <td class="p-3">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${item.status === 'Paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}">
            ${item.status}
          </span>
        </td>
        <td class="p-3 text-slate-500">${item.mode}</td>
        <td class="p-3 text-center">
          <button onclick="printThermalReceipt('${stu.id}', '${item.challanNo}')" class="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-[10px] font-bold hover:bg-emerald-600 hover:text-white transition">
            Receipt Slip
          </button>
        </td>
      `;
      feeTbody.appendChild(tr);
    });
  }

  // Exams Tab Table
  const examsTbody = document.getElementById('profileExamsTableBody');
  if (examsTbody) {
    examsTbody.innerHTML = '';
    stu.subjects.forEach(sub => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="p-3 font-bold">${isUr && sub.nameUrdu ? sub.nameUrdu : sub.name}</td>
        <td class="p-3 text-slate-500">${sub.maxMarks}</td>
        <td class="p-3 text-slate-500">${sub.passMarks}</td>
        <td class="p-3 font-extrabold text-emerald-600">${sub.obtainedMarks}</td>
        <td class="p-3"><span class="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-bold text-[10px]">${sub.grade}</span></td>
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
      btn.className = "px-4 py-2.5 border-b-2 border-emerald-600 text-emerald-600 flex items-center gap-2 font-bold";
      content.classList.remove('hidden');
    } else {
      btn.className = "px-4 py-2.5 border-b-2 border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-2 font-bold";
      content.classList.add('hidden');
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
    state.students.filter(s => s.schoolId === state.currentSchoolId).forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.innerText = `${s.rollNo} - ${s.name} (${s.class})`;
      if (s.id === state.currentSelectedStudentId) opt.selected = true;
      selector.appendChild(opt);
    });
  }

  renderIdCardForStudent(state.currentSelectedStudentId);
}

function renderIdCardForStudent(studentId) {
  state.currentSelectedStudentId = studentId;
  const stu = state.students.find(s => s.id === studentId) || state.students[0];
  const school = getActiveSchool();
  const isUr = state.currentLang === 'ur';

  document.getElementById('idCardSchoolName').innerText = isUr ? school.nameUrdu : school.name;
  document.getElementById('idCardStudentName').innerText = isUr && stu.nameUrdu ? stu.nameUrdu : stu.name;
  document.getElementById('idCardFatherName').innerText = `s/o ${isUr && stu.fatherNameUrdu ? stu.fatherNameUrdu : stu.fatherName}`;
  document.getElementById('idCardClass').innerText = `${stu.class}-${stu.section}`;
  document.getElementById('idCardRoll').innerText = stu.rollNo;
  document.getElementById('idCardAdmNo').innerText = stu.admissionNo;
  document.getElementById('idCardBlood').innerText = stu.bloodGroup;
  document.getElementById('idCardEmergencyPhone').innerText = stu.emergencyContact;
  document.getElementById('idCardAddressShort').innerText = isUr && stu.villageUrdu ? stu.villageUrdu : stu.village;

  // Generate Scannable QR Code
  const qrContainer = document.getElementById('idCardQrContainer');
  if (qrContainer) {
    qrContainer.innerHTML = '';
    const verificationData = JSON.stringify({
      school: school.name,
      bise: school.biseAffiliation,
      student: stu.name,
      roll: stu.rollNo,
      adm: stu.admissionNo,
      class: `${stu.class}-${stu.section}`,
      status: "VERIFIED_ENROLLED_2026"
    });

    try {
      new QRCode(qrContainer, {
        text: verificationData,
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

// ==================== SCREEN 6: PARENT PORTAL ====================
function switchParentChild(studentId) {
  state.currentSelectedStudentId = studentId;
  renderParentPortal();
}

function renderParentPortal() {
  const stu = state.students.find(s => s.id === state.currentSelectedStudentId) || state.students[0];
  state.currentSelectedStudentId = stu.id;

  const btn1 = document.getElementById('pChildBtn1');
  const btn2 = document.getElementById('pChildBtn2');
  if (stu.id === 'STU-1001') {
    if (btn1) btn1.className = "px-3 py-1 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs";
    if (btn2) btn2.className = "px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs";
  } else {
    if (btn1) btn1.className = "px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs";
    if (btn2) btn2.className = "px-3 py-1 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs";
  }

  document.getElementById('parentChildAvatar').innerText = stu.name.split(' ').map(n => n[0]).join('');
  document.getElementById('parentChildName').innerText = stu.name;
  document.getElementById('parentChildClass').innerText = `${stu.class} - Section ${stu.section} • Roll #${stu.rollNo}`;
  document.getElementById('parentArrivalTime').innerText = stu.todayArrivalTime || "08:14 AM";
  document.getElementById('parentChallanNo').innerText = stu.currentChallanNo;
  document.getElementById('parentFeeAmount').innerText = `PKR ${stu.arrears > 0 ? (stu.monthlyTuition + stu.arrears).toLocaleString() : stu.monthlyTuition.toLocaleString()}`;

  // Homework List
  const hwList = document.getElementById('parentHomeworkList');
  if (hwList) {
    hwList.innerHTML = '';
    const isUr = state.currentLang === 'ur';
    DEMO_HOMEWORK.forEach(hw => {
      const item = document.createElement('div');
      item.className = "p-2.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs";
      item.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="font-bold text-emerald-600">${isUr ? hw.subjectUrdu : hw.subject}</span>
          <span class="text-[10px] text-slate-400">Due: ${hw.submissionDate}</span>
        </div>
        <p class="font-bold text-slate-800 dark:text-slate-200 mt-1">${isUr ? hw.titleUrdu : hw.title}</p>
        <p class="text-[11px] text-slate-500 mt-0.5">${isUr ? hw.detailsUrdu : hw.details}</p>
      `;
      hwList.appendChild(item);
    });
  }
}

function openParentPayModal() {
  const stu = state.students.find(s => s.id === state.currentSelectedStudentId) || state.students[0];
  openCollectFeeModal(stu.id);
}

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

// ==================== SCREEN 8: ATTENDANCE MANAGEMENT ====================
function initAttendanceSession() {
  state.students.forEach(s => {
    state.attendanceSession[s.id] = s.todayAttendance || 'Present';
  });
}

function renderAttendanceSheet() {
  const tbody = document.getElementById('attendanceSheetBody');
  if (!tbody) return;

  const isUr = state.currentLang === 'ur';
  const students = state.students.filter(s => s.schoolId === state.currentSchoolId);

  tbody.innerHTML = '';
  let pCount = 0, aCount = 0, lCount = 0;

  students.forEach(stu => {
    const status = state.attendanceSession[stu.id] || 'Present';
    if (status === 'Present') pCount++;
    else if (status === 'Absent') aCount++;
    else if (status === 'Leave') lCount++;

    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50 dark:hover:bg-slate-700/50 transition";
    tr.innerHTML = `
      <td class="p-3.5 font-bold text-slate-900 dark:text-white">#${stu.rollNo}</td>
      <td class="p-3.5 font-bold">${isUr && stu.nameUrdu ? stu.nameUrdu : stu.name}</td>
      <td class="p-3.5 text-slate-500">${isUr && stu.fatherNameUrdu ? stu.fatherNameUrdu : stu.fatherName}</td>
      <td class="p-3.5 font-mono text-slate-500">${status === 'Present' ? (stu.todayArrivalTime || '08:12 AM') : '--:--'}</td>
      <td class="p-3.5 text-center">
        <div class="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-700 gap-1">
          <button onclick="setStudentAttendance('${stu.id}', 'Present')" class="px-3 py-1 rounded-lg text-xs font-bold transition ${status === 'Present' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-emerald-600'}">P (Present)</button>
          <button onclick="setStudentAttendance('${stu.id}', 'Absent')" class="px-3 py-1 rounded-lg text-xs font-bold transition ${status === 'Absent' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-rose-600'}">A (Absent)</button>
          <button onclick="setStudentAttendance('${stu.id}', 'Leave')" class="px-3 py-1 rounded-lg text-xs font-bold transition ${status === 'Leave' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-amber-600'}">L (Leave)</button>
        </div>
      </td>
      <td class="p-3.5 text-right">
        ${status === 'Absent' ? 
          '<span class="text-[10px] text-rose-600 font-bold bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded border border-rose-200"><i class="fa-solid fa-paper-plane mr-1"></i> SMS Alert Queued</span>' : 
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
  state.students.forEach(s => {
    state.attendanceSession[s.id] = status;
  });
  renderAttendanceSheet();
  showToast(`Marked all students as ${status}`);
}

function saveAttendanceRegister() {
  let absentCount = 0;
  Object.keys(state.attendanceSession).forEach(id => {
    const stu = state.students.find(s => s.id === id);
    if (stu) {
      stu.todayAttendance = state.attendanceSession[id];
      if (stu.todayAttendance === 'Absent') absentCount++;
    }
  });

  showToast(`Attendance saved! ${absentCount} unexcused absence alerts triggered via SMS.`);
  renderAdminDashboard();
}

// ==================== SCREEN 9: FEE MANAGEMENT ====================
function renderFeeManagement() {
  const tbody = document.getElementById('feeCollectionTableBody');
  if (!tbody) return;

  const students = state.students.filter(s => s.schoolId === state.currentSchoolId);
  tbody.innerHTML = '';

  students.forEach(stu => {
    const totalDue = stu.monthlyTuition + (stu.arrears || 0);
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50 dark:hover:bg-slate-700/50 transition";
    tr.innerHTML = `
      <td class="p-3.5 font-mono font-bold text-slate-800 dark:text-slate-200">${stu.currentChallanNo}</td>
      <td class="p-3.5 font-bold">${stu.name}</td>
      <td class="p-3.5 text-slate-500">${stu.class}-${stu.section}</td>
      <td class="p-3.5">PKR ${stu.monthlyTuition.toLocaleString()}</td>
      <td class="p-3.5 font-bold ${stu.arrears > 0 ? 'text-rose-600' : 'text-slate-400'}">PKR ${(stu.arrears || 0).toLocaleString()}</td>
      <td class="p-3.5 font-black text-slate-900 dark:text-white">PKR ${totalDue.toLocaleString()}</td>
      <td class="p-3.5">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${stu.feeStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
          ${stu.feeStatus}
        </span>
      </td>
      <td class="p-3.5 text-center">
        <div class="flex items-center justify-center gap-2">
          ${stu.feeStatus !== 'Paid' ? 
            `<button onclick="openCollectFeeModal('${stu.id}')" class="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500">Collect</button>` : 
            `<button onclick="printThermalReceipt('${stu.id}', '${stu.currentChallanNo}')" class="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold hover:bg-emerald-600 hover:text-white"><i class="fa-solid fa-receipt mr-1"></i> Slip</button>`}
          <button onclick="print3CopyBankChallan('${stu.id}')" class="px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-100" title="3-Copy Bank Challan"><i class="fa-solid fa-print"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Payroll Table
  const payrollBody = document.getElementById('payrollTableBody');
  if (payrollBody) {
    payrollBody.innerHTML = '';
    DEMO_STAFF_PAYROLL.forEach(emp => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="p-3.5 font-mono text-slate-400">${emp.id}</td>
        <td class="p-3.5 font-bold text-slate-800 dark:text-slate-200">${emp.name}</td>
        <td class="p-3.5 text-slate-500">${emp.role}</td>
        <td class="p-3.5">PKR ${emp.basic.toLocaleString()}</td>
        <td class="p-3.5 text-emerald-600">+PKR ${emp.allowance.toLocaleString()}</td>
        <td class="p-3.5 font-black text-slate-900 dark:text-white">PKR ${emp.net.toLocaleString()}</td>
        <td class="p-3.5"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${emp.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">${emp.status}</span></td>
        <td class="p-3.5 text-slate-500">${emp.mode}</td>
      `;
      payrollBody.appendChild(tr);
    });
  }
}

function filterFeeTable() {
  const search = document.getElementById('feeSearchInput').value.toLowerCase();
  const rows = document.querySelectorAll('#feeCollectionTableBody tr');
  rows.forEach(r => {
    const text = r.innerText.toLowerCase();
    r.style.display = text.includes(search) ? '' : 'none';
  });
}

function switchFeeSubTab(tab) {
  const subtabs = ['collection', 'challans', 'payroll'];
  subtabs.forEach(t => {
    const el = document.getElementById(`feeSubTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
    const btn = document.getElementById(`feeSubTabBtn${t.charAt(0).toUpperCase() + t.slice(1, 4)}`);
    if (t === tab) {
      if (el) el.classList.remove('hidden');
      if (btn) btn.className = "px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold transition shadow-xs";
    } else {
      if (el) el.classList.add('hidden');
      if (btn) btn.className = "px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 transition";
    }
  });
}

function triggerBulkChallanGen() {
  showToast("Generated 684 Monthly Fee Challans for October 2026!");
}

// Collect Fee Modal
function openCollectFeeModal(studentId) {
  const stu = state.students.find(s => s.id === studentId) || state.students[0];
  const modal = document.getElementById('modalCollectFee');
  const content = document.getElementById('collectFeeModalContent');

  const totalDue = stu.monthlyTuition + (stu.arrears || 0);

  content.innerHTML = `
    <div class="p-3 bg-slate-50 dark:bg-slate-700 rounded-2xl flex items-center justify-between">
      <div>
        <h4 class="font-bold text-sm">${stu.name} (Roll #${stu.rollNo})</h4>
        <p class="text-slate-500 text-[11px]">${stu.class}-${stu.section} &middot; Challan #${stu.currentChallanNo}</p>
      </div>
      <div class="text-right">
        <span class="text-[10px] text-slate-400 block font-semibold">TOTAL PAYABLE</span>
        <strong class="text-base font-black text-emerald-600">PKR ${totalDue.toLocaleString()}</strong>
      </div>
    </div>

    <div class="space-y-2">
      <label class="block font-semibold">Payment Mode</label>
      <select id="feePaymentModeSelect" class="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2">
        <option value="Cash at Counter">Cash at School Fee Counter</option>
        <option value="JazzCash">JazzCash (Till # 0943-41258)</option>
        <option value="EasyPaisa">EasyPaisa</option>
        <option value="Bank Deposit">Bank of Khyber (Chitral Branch)</option>
      </select>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block font-semibold">Amount Received (PKR)</label>
        <input type="number" id="feeReceivedAmount" value="${totalDue}" class="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 font-bold text-emerald-600">
      </div>
      <div>
        <label class="block font-semibold">Receipt / Trx Reference</label>
        <input type="text" id="feeReceiptRef" value="TRX-${Date.now().toString().slice(-6)}" class="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 font-mono">
      </div>
    </div>

    <div class="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
      <button type="button" onclick="closeCollectFeeModal()" class="px-4 py-2 rounded-xl text-slate-500">Cancel</button>
      <button type="button" onclick="confirmFeeCollection('${stu.id}')" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
        Confirm & Print Receipt
      </button>
    </div>
  `;

  modal.classList.remove('hidden');
}

function closeCollectFeeModal() {
  document.getElementById('modalCollectFee').classList.add('hidden');
}

function confirmFeeCollection(studentId) {
  const stu = state.students.find(s => s.id === studentId);
  const mode = document.getElementById('feePaymentModeSelect').value;
  const amount = parseInt(document.getElementById('feeReceivedAmount').value) || stu.monthlyTuition;

  stu.feeStatus = "Paid";
  stu.arrears = 0;
  stu.feeLedger.unshift({
    month: "October 2026",
    challanNo: stu.currentChallanNo,
    amount: amount,
    status: "Paid",
    paidDate: "2026-10-12",
    mode: mode
  });

  closeCollectFeeModal();
  renderFeeManagement();
  showToast(`Payment of PKR ${amount.toLocaleString()} recorded for ${stu.name}!`);
  printThermalReceipt(stu.id, stu.currentChallanNo);
}

// Thermal Receipt Modal
function printThermalReceipt(studentId, challanNo) {
  const stu = state.students.find(s => s.id === studentId) || state.students[0];
  const school = getActiveSchool();
  const container = document.getElementById('thermalReceiptContainer');
  const modal = document.getElementById('modalThermalReceipt');

  container.innerHTML = `
    <div class="thermal-receipt text-left text-xs space-y-2">
      <div class="text-center border-b border-dashed border-slate-400 pb-2">
        <h3 class="font-extrabold text-sm uppercase">${school.name}</h3>
        <p class="text-[10px] text-slate-600">${school.campus}</p>
        <p class="text-[10px] font-bold text-slate-800">OFFICIAL FEE PAYMENT SLIP</p>
      </div>

      <div class="text-[10px] space-y-1">
        <div class="flex justify-between"><span>Date: 12-Oct-2026</span><span>Time: 11:42 AM</span></div>
        <div class="flex justify-between"><span>Challan #:</span><strong>${challanNo || stu.currentChallanNo}</strong></div>
        <div class="flex justify-between"><span>Student:</span><strong>${stu.name}</strong></div>
        <div class="flex justify-between"><span>Father:</span><span>${stu.fatherName}</span></div>
        <div class="flex justify-between"><span>Class & Roll:</span><span>${stu.class}-${stu.section} (Roll: ${stu.rollNo})</span></div>
      </div>

      <div class="border-t border-b border-dashed border-slate-400 py-1 text-[10px]">
        <div class="flex justify-between py-0.5"><span>Monthly Tuition Fee</span><span>PKR ${stu.monthlyTuition.toLocaleString()}</span></div>
        <div class="flex justify-between py-0.5"><span>Winter Heating Levy</span><span>PKR 800</span></div>
        <div class="flex justify-between py-0.5 font-bold text-xs border-t border-slate-300 mt-1 pt-1">
          <span>TOTAL PAID</span><span>PKR ${(stu.monthlyTuition + 800).toLocaleString()}</span>
        </div>
      </div>

      <div class="text-[9px] text-center text-slate-500 pt-2">
        <p>Payment Mode: JazzCash / Cash Counter</p>
        <p>Thank you for supporting quality education in Chitral.</p>
        <p class="font-mono mt-1">*** SYSTEM GENERATED RECEIPT ***</p>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
}

function closeThermalReceiptModal() {
  document.getElementById('modalThermalReceipt').classList.add('hidden');
}

// 3-Copy Bank Challan Modal
function print3CopyBankChallan(studentId) {
  const stu = state.students.find(s => s.id === studentId) || state.students[0];
  const school = getActiveSchool();
  const container = document.getElementById('bankChallan3CopyContainer');
  const modal = document.getElementById('modalBankChallan');

  const copies = ["SCHOOL COPY", "BANK COPY", "STUDENT COPY"];
  let html = `<div class="bank-challan-3copy text-xs">`;

  copies.forEach(copyName => {
    html += `
      <div class="p-3 border border-slate-400 rounded-lg space-y-2 bg-white text-slate-900">
        <div class="text-center border-b border-slate-300 pb-1.5">
          <h4 class="font-bold text-[11px] uppercase">${school.name}</h4>
          <span class="text-[9px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded">${copyName}</span>
          <p class="text-[9px] text-slate-500 mt-0.5">Bank of Khyber / HBL Chitral</p>
        </div>

        <div class="text-[10px] space-y-1">
          <div class="flex justify-between"><span>Challan #:</span><strong>${stu.currentChallanNo}</strong></div>
          <div class="flex justify-between"><span>Student:</span><strong>${stu.name}</strong></div>
          <div class="flex justify-between"><span>Class & Roll:</span><span>${stu.class}-${stu.section} (#${stu.rollNo})</span></div>
          <div class="flex justify-between"><span>Due Date:</span><strong class="text-rose-600">15-Oct-2026</strong></div>
        </div>

        <div class="border-t border-b border-slate-200 py-1 text-[10px] space-y-0.5">
          <div class="flex justify-between"><span>Tuition Fee</span><span>PKR ${stu.monthlyTuition.toLocaleString()}</span></div>
          <div class="flex justify-between"><span>Heating Charges</span><span>PKR 800</span></div>
          <div class="flex justify-between font-bold border-t border-slate-300 pt-1">
            <span>Payable Amount</span><span>PKR ${(stu.monthlyTuition + 800).toLocaleString()}</span>
          </div>
        </div>

        <div class="pt-4 flex justify-between text-[8px] text-slate-400">
          <span>Cashier Signature</span>
          <span>Depositor Signature</span>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
  modal.classList.remove('hidden');
}

function closeBankChallanModal() {
  document.getElementById('modalBankChallan').classList.add('hidden');
}

// ==================== SCREEN 10: EXAMS & RESULTS MANAGEMENT ====================
function renderExamMarksGrid() {
  const tbody = document.getElementById('examMarksGridBody');
  if (!tbody) return;

  const students = state.students.filter(s => s.schoolId === state.currentSchoolId);
  tbody.innerHTML = '';

  students.forEach((stu, idx) => {
    const sub = stu.subjects[0] || { obtainedMarks: 85, grade: "A+" };
    const theoryMarks = Math.round(sub.obtainedMarks * 0.75);
    const pracMarks = sub.obtainedMarks - theoryMarks;
    const pct = sub.obtainedMarks;

    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50 dark:hover:bg-slate-700/50 transition";
    tr.innerHTML = `
      <td class="p-3.5 font-bold">#${stu.rollNo}</td>
      <td class="p-3.5 font-bold text-slate-900 dark:text-white">${stu.name}</td>
      <td class="p-3.5 font-semibold text-slate-500">100</td>
      <td class="p-3.5">
        <input type="number" id="thMarks_${stu.id}" onchange="recalculateStudentRow('${stu.id}')" value="${theoryMarks}" max="75" min="0" class="w-16 p-1.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 font-bold">
      </td>
      <td class="p-3.5">
        <input type="number" id="prMarks_${stu.id}" onchange="recalculateStudentRow('${stu.id}')" value="${pracMarks}" max="25" min="0" class="w-16 p-1.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 font-bold">
      </td>
      <td class="p-3.5 font-black text-slate-900 dark:text-white" id="totalMarks_${stu.id}">${sub.obtainedMarks}</td>
      <td class="p-3.5 font-bold text-emerald-600" id="pctMarks_${stu.id}">${pct}%</td>
      <td class="p-3.5">
        <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" id="gradeMarks_${stu.id}">
          ${sub.grade}
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
  if (pct >= 80) grade = "A+";
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

function saveExamMarksGrid() {
  showToast("Exam marks successfully calculated and saved to official ledger!");
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
    state.students.filter(s => s.schoolId === state.currentSchoolId).forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.innerText = `${s.rollNo} - ${s.name} (${s.class})`;
      if (s.id === state.currentSelectedStudentId) opt.selected = true;
      selector.appendChild(opt);
    });
  }

  renderDmcForStudent(state.currentSelectedStudentId);
}

function renderDmcForStudent(studentId) {
  state.currentSelectedStudentId = studentId;
  const stu = state.students.find(s => s.id === studentId) || state.students[0];
  const school = getActiveSchool();

  document.getElementById('dmcSchoolHeading').innerText = school.name;

  // Metadata Grid
  const meta = document.getElementById('dmcMetadataGrid');
  if (meta) {
    meta.innerHTML = `
      <div><span class="text-slate-400 block text-[10px]">STUDENT NAME</span><strong class="text-slate-900">${stu.name}</strong></div>
      <div><span class="text-slate-400 block text-[10px]">FATHER'S NAME</span><strong class="text-slate-900">${stu.fatherName}</strong></div>
      <div><span class="text-slate-400 block text-[10px]">ROLL NUMBER</span><strong class="text-slate-900">${stu.rollNo}</strong></div>
      <div><span class="text-slate-400 block text-[10px]">REGISTRATION NO</span><strong class="text-slate-900">${stu.admissionNo}</strong></div>
      <div><span class="text-slate-400 block text-[10px]">CLASS & SECTION</span><strong class="text-slate-900">${stu.class} - ${stu.section}</strong></div>
      <div><span class="text-slate-400 block text-[10px]">EXAMINATION</span><strong class="text-slate-900">First Term Exam 2026</strong></div>
    `;
  }

  // Subject Table
  const tbody = document.getElementById('dmcSubjectTableBody');
  if (tbody) {
    tbody.innerHTML = '';
    let totalMax = 0, totalObt = 0;

    stu.subjects.forEach(sub => {
      totalMax += sub.maxMarks;
      totalObt += sub.obtainedMarks;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="p-2.5 font-bold">${sub.name}</td>
        <td class="p-2.5 text-center font-mono">${sub.maxMarks}</td>
        <td class="p-2.5 text-center font-mono">${sub.passMarks}</td>
        <td class="p-2.5 text-center font-black text-slate-900">${sub.obtainedMarks}</td>
        <td class="p-2.5 text-center font-bold text-emerald-700">${sub.grade}</td>
        <td class="p-2.5 text-slate-600 text-[11px]">${sub.remarks}</td>
      `;
      tbody.appendChild(tr);
    });

    const pct = ((totalObt / totalMax) * 100).toFixed(1);
    document.getElementById('dmcGrandTotal').innerText = `${totalObt} / ${totalMax}`;
    document.getElementById('dmcOverallPct').innerText = `${pct}% (Grade A+)`;
    document.getElementById('dmcClassPosition').innerText = stu.examPosition || "Top Standing";
  }
}

function printDmcReport() {
  document.body.classList.add('printing-dmc');
  window.print();
  setTimeout(() => {
    document.body.classList.remove('printing-dmc');
  }, 1000);
}

// ==================== SCREEN 12: WHATSAPP / SMS ALERTS HUB ====================
function renderAlertsHub() {
  const container = document.getElementById('broadcastTemplateButtons');
  if (!container) return;

  container.innerHTML = '';
  const isUr = state.currentLang === 'ur';

  DEMO_BROADCAST_TEMPLATES.forEach(tpl => {
    const btn = document.createElement('button');
    btn.className = "p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 bg-slate-50 dark:bg-slate-700 text-left text-xs transition";
    btn.onclick = () => selectBroadcastTemplate(tpl);
    btn.innerHTML = `
      <strong class="block text-slate-800 dark:text-slate-200 mb-0.5">${isUr ? tpl.titleUr : tpl.titleEn}</strong>
      <span class="text-[10px] text-slate-500 truncate block">${isUr ? tpl.contentUr : tpl.contentEn}</span>
    `;
    container.appendChild(btn);
  });

  renderBroadcastHistory();
}

function selectBroadcastTemplate(template) {
  const isUr = state.currentLang === 'ur';
  const txt = document.getElementById('broadcastContentTextarea');
  const preview = document.getElementById('whatsappBubblePreview');
  const content = isUr ? template.contentUr : template.contentEn;

  txt.value = content;
  preview.innerText = content;
  updateBroadcastCharCount();
}

function updateBroadcastCharCount() {
  const txt = document.getElementById('broadcastContentTextarea');
  const count = document.getElementById('broadcastCharCount');
  const preview = document.getElementById('whatsappBubblePreview');
  count.innerText = `${txt.value.length} characters`;
  preview.innerText = txt.value || "Select a prebuilt template or type your message on the left to see live preview.";
}

function dispatchBroadcastAlert() {
  const txt = document.getElementById('broadcastContentTextarea').value;
  if (!txt.trim()) {
    showToast("Please enter message content or select a template!");
    return;
  }

  const audience = document.getElementById('broadcastAudienceSelect').selectedOptions[0].text;
  const channel = document.getElementById('broadcastChannelSelect').selectedOptions[0].text;

  state.broadcastLogs.unshift({
    time: "Just now",
    title: txt.slice(0, 30) + "...",
    audience: audience,
    channel: channel,
    status: "Delivered (100%)"
  });

  renderBroadcastHistory();
  showToast(`Broadcast queued & dispatched to ${audience}!`);
}

function renderBroadcastHistory() {
  const container = document.getElementById('recentBroadcastHistory');
  if (!container) return;

  container.innerHTML = '';
  state.broadcastLogs.forEach(log => {
    const item = document.createElement('div');
    item.className = "p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs";
    item.innerHTML = `
      <div class="flex items-center justify-between">
        <strong class="text-slate-900 dark:text-white">${log.title}</strong>
        <span class="text-[10px] text-emerald-600 font-bold">${log.status}</span>
      </div>
      <p class="text-[10px] text-slate-400 mt-0.5">${log.time} &middot; Audience: ${log.audience}</p>
    `;
    container.appendChild(item);
  });
}

// ==================== SCREEN 13: SETTINGS & BACKUP ====================
function saveSchoolSettings() {
  const school = getActiveSchool();
  school.name = document.getElementById('cfgSchoolName').value;
  school.campus = document.getElementById('cfgCampusAddress').value;
  school.biseAffiliation = document.getElementById('cfgBiseCode').value;
  school.phone = document.getElementById('cfgSchoolPhone').value;
  school.email = document.getElementById('cfgSchoolEmail').value;

  updateSchoolHeaderUI();
  initSchoolTenants();
  showToast("School configuration changes saved successfully!");
}

function downloadJsonBackup() {
  const backupData = {
    school: getActiveSchool(),
    academicSession: "2026-2027",
    timestamp: new Date().toISOString(),
    students: state.students,
    payroll: DEMO_STAFF_PAYROLL
  };

  const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chitral_educloud_backup_${getActiveSchool().id}_2026.json`;
  a.click();
  showToast("Encrypted JSON database backup downloaded!");
}

function resetDemoDataset() {
  state.students = JSON.parse(JSON.stringify(DEMO_STUDENTS));
  state.schools = JSON.parse(JSON.stringify(DEMO_SCHOOLS));
  initAttendanceSession();
  renderScreen(state.currentScreen);
  showToast("System reset to default Chitral demo state!");
}

// ==================== TOAST NOTIFICATION UTILITY ====================
function showToast(message) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = "bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 border border-slate-700 pointer-events-auto transition transform translate-y-2 opacity-0";
  toast.innerHTML = `
    <i class="fa-solid fa-circle-check text-emerald-400 text-sm"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Trigger animation
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
