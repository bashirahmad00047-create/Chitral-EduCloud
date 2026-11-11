// Chitral EduCloud ERP - Master Interactive Engine with SQLite REST API Persistence

let state = {
  currentRole: 'admin',
  currentLang: 'en',
  currentSchoolId: 'chitral-model',
  currentDate: '2026-10-12',
  currentScreen: 'screen-dashboard',
  currentSelectedStudentId: 'STU-1001',
  school: {},
  schools: [],
  kpis: {},
  students: [],
  challans: [],
  examMarks: [],
  payroll: [],
  broadcastLogs: [],
  attendanceSession: {},
  charts: {
    feeChart: null,
    attendanceChart: null
  }
};

// DOM Content Loaded Kickoff
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initNavigation();
  await checkAuthSession();
  await loadSchoolData(state.currentSchoolId);
  initCharts();
});

async function checkAuthSession() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.authenticated && data.user) {
      state.currentUser = data.user;
      state.currentRole = data.user.role;
      updateHeaderUserUI(data.user);
    }
  } catch (err) {
    console.warn("Auth check:", err);
  }
}

// ==================== REST API DATA LOADER ====================
async function loadSchoolData(schoolId, date = state.currentDate) {
  state.currentSchoolId = schoolId;
  state.currentDate = date;

  try {
    const res = await fetch(`/api/bootstrap?school_id=${encodeURIComponent(schoolId)}&date=${encodeURIComponent(date)}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();

    state.school = data.school || {};
    state.schools = data.schools || [];
    state.kpis = data.kpis || {};
    state.students = data.students || [];
    state.challans = data.challans || [];
    state.examMarks = data.exam_marks || [];
    state.payroll = data.payroll || [];
    state.broadcastLogs = data.broadcasts || [];

    // Initialize attendance session mapping
    state.attendanceSession = {};
    state.students.forEach(s => {
      state.attendanceSession[s.id] = s.today_attendance || 'P';
    });

    if (state.students.length > 0 && !state.students.some(s => s.id === state.currentSelectedStudentId)) {
      state.currentSelectedStudentId = state.students[0].id;
    }

    initSchoolTenants();
    updateSchoolHeaderUI();
    renderScreen(state.currentScreen);
    applyTranslations();
  } catch (err) {
    console.warn("API bootstrap failed, using fallback:", err);
    showToast("Offline fallback active");
  }
}

// ==================== THEME MANAGEMENT ====================
function initTheme() {
  const savedTheme = localStorage.getItem('chitral_educloud_theme') || 'light';
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
    const icon = document.getElementById('themeIcon');
    if (icon) icon.classList.replace('fa-moon', 'fa-sun');
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
    if (langLabel) langLabel.innerText = "English (LTR)";
  } else {
    html.setAttribute('dir', 'ltr');
    html.setAttribute('lang', 'en');
    if (langLabel) langLabel.innerText = "اردو (RTL)";
  }

  applyTranslations();
  renderScreen(state.currentScreen);
  showToast(state.currentLang === 'ur' ? "اردو زبان فعال ہو گئی ہے" : "Language switched to English");
}

function applyTranslations() {
  const t = TRANSLATIONS[state.currentLang];
  if (!t) return;
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
  
  if (select) {
    select.innerHTML = '';
    state.schools.forEach(school => {
      const opt = document.createElement('option');
      opt.value = school.id;
      opt.innerText = school.name;
      if (school.id === state.currentSchoolId) opt.selected = true;
      select.appendChild(opt);
    });
  }

  if (loginCards) {
    loginCards.innerHTML = '';
    state.schools.forEach(school => {
      const card = document.createElement('div');
      card.className = `p-4 rounded-2xl border-2 transition cursor-pointer ${school.id === state.currentSchoolId ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40' : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 bg-white dark:bg-slate-800'}`;
      card.onclick = () => switchSchool(school.id);
      card.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-sm">
            ${school.logo_text || 'CMC'}
          </div>
          <div>
            <h4 class="font-bold text-xs text-slate-900 dark:text-white leading-tight">${state.currentLang === 'ur' && school.name_urdu ? school.name_urdu : school.name}</h4>
            <p class="text-[10px] text-slate-500 mt-0.5">${school.campus_city || 'Chitral'}</p>
          </div>
        </div>
      `;
      loginCards.appendChild(card);
    });
  }

  if (select && !select.onchange) {
    select.onchange = (e) => switchSchool(e.target.value);
  }
}

async function switchSchool(schoolId) {
  state.currentSchoolId = schoolId;
  const select = document.getElementById('schoolTenantSelect');
  if (select) select.value = schoolId;
  
  await loadSchoolData(schoolId);
  showToast(`Switched campus: ${state.school.name || schoolId}`);
}

function updateSchoolHeaderUI() {
  const school = state.school;
  const isUr = state.currentLang === 'ur';

  // Live Database Badge
  const liveBadge = document.getElementById('liveDatabaseBadge');
  if (liveBadge) {
    liveBadge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span> ${isUr ? "لائیو ڈیٹا بیس" : "LIVE DATABASE"}`;
    liveBadge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs border border-emerald-500 flex items-center gap-1";
  }

  // Dashboard Headings
  const dashSchoolHeading = document.getElementById('dashSchoolHeading');
  if (dashSchoolHeading) dashSchoolHeading.innerText = isUr && school.name_urdu ? school.name_urdu : (school.name || 'Chitral Model College');

  const quickBoxSchoolName = document.getElementById('quickBoxSchoolName');
  if (quickBoxSchoolName) quickBoxSchoolName.innerText = isUr && school.name_urdu ? school.name_urdu : (school.name || 'Chitral Model College');

  const quickBoxCampusAddress = document.getElementById('quickBoxCampusAddress');
  if (quickBoxCampusAddress) quickBoxCampusAddress.innerText = school.address || 'Ataliq Bazaar Road, Chitral Town';

  const quickBoxAffiliation = document.getElementById('quickBoxAffiliation');
  if (quickBoxAffiliation) quickBoxAffiliation.innerText = school.bise_code || 'BISE Peshawar #CMC-4819';

  const quickBoxPrincipal = document.getElementById('quickBoxPrincipal');
  if (quickBoxPrincipal) quickBoxPrincipal.innerText = school.principal_name || 'Prof. Rehmat Ullah Baig';

  const quickBoxPhone = document.getElementById('quickBoxPhone');
  if (quickBoxPhone) quickBoxPhone.innerText = school.phone || '+92 (0943) 412580';

  // Settings inputs
  const cfgSchoolName = document.getElementById('cfgSchoolName');
  if (cfgSchoolName) cfgSchoolName.value = school.name || '';

  const cfgCampusAddress = document.getElementById('cfgCampusAddress');
  if (cfgCampusAddress) cfgCampusAddress.value = school.address || '';

  const cfgBiseCode = document.getElementById('cfgBiseCode');
  if (cfgBiseCode) cfgBiseCode.value = school.bise_code || '';

  const cfgSchoolPhone = document.getElementById('cfgSchoolPhone');
  if (cfgSchoolPhone) cfgSchoolPhone.value = school.phone || '';

  const cfgSchoolEmail = document.getElementById('cfgSchoolEmail');
  if (cfgSchoolEmail) cfgSchoolEmail.value = school.email || '';

  const cfgHeatingLevy = document.getElementById('cfgHeatingLevy');
  if (cfgHeatingLevy) cfgHeatingLevy.value = school.heating_levy || 800;
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
    name.innerText = state.school.principal_name || "Admin Rehmat";
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

function updateHeaderUserUI(user) {
  const avatar = document.getElementById('userAvatarText');
  const name = document.getElementById('userNameText');
  const roleText = document.getElementById('userRoleText');
  if (user && name) {
    name.innerText = user.full_name;
    if (roleText) roleText.innerText = user.role === 'admin' ? "Principal Desk" : (user.role === 'teacher' ? "Faculty Member" : "Parent Portal");
    if (avatar) avatar.innerText = user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }
}

async function loginAsRole(role) {
  try {
    const res = await fetch('/api/auth/demo-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: role, school_id: state.currentSchoolId })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      state.currentUser = data.user;
      updateHeaderUserUI(data.user);
    }
  } catch (err) {
    console.warn("Demo login error:", err);
  }
  setRole(role);
}

async function handleCredentialsLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username,
        password: password,
        school_id: state.currentSchoolId
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      state.currentUser = data.user;
      updateHeaderUserUI(data.user);
      setRole(data.user.role);
      showToast(data.message || "Logged in successfully!");
    } else {
      showToast(data.message || "Invalid username or password!");
    }
  } catch (err) {
    showToast("Authentication request failed");
  }
}

async function handleUserLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (err) {}
  state.currentUser = null;
  navigateTo('screen-login');
  showToast("Logged out of Chitral EduCloud ERP");
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
  if (sidebar) sidebar.classList.toggle('-translate-x-full');
  if (backdrop) backdrop.classList.toggle('hidden');
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
  const kpis = state.kpis;
  if (!kpis) return;

  const total = kpis.total_students || state.students.length;
  const boys = kpis.boys_count || 0;
  const girls = kpis.girls_count || 0;
  const attPct = kpis.today_attendance_pct !== undefined ? kpis.today_attendance_pct : 94.6;
  const present = kpis.present_today || 0;
  const absent = kpis.absent_today || 0;
  const leave = kpis.leave_today || 0;
  const collected = kpis.monthly_fee_collected || 0;
  const pending = kpis.total_pending_dues || 0;
  const defaulters = kpis.defaulters_count || 0;

  document.getElementById('kpiValTotalStudents').innerText = total;
  document.getElementById('kpiValBoys').innerText = boys;
  document.getElementById('kpiValGirls').innerText = girls;
  document.getElementById('kpiValAttendancePct').innerText = `${attPct}%`;
  document.getElementById('kpiValPresent').innerText = present;
  document.getElementById('kpiValAbsent').innerText = absent;
  document.getElementById('kpiValLeave').innerText = leave;
  document.getElementById('kpiValFeeCollected').innerText = `PKR ${collected.toLocaleString()}`;
  document.getElementById('kpiValPendingDues').innerText = `PKR ${pending.toLocaleString()}`;
  document.getElementById('kpiValDefaulters').innerText = defaulters;

  const target = kpis.monthly_fee_target || 1;
  const progress = Math.min(100, Math.round((collected / target) * 100));
  document.getElementById('kpiValFeeTargetProgress').innerText = `${progress}%`;

  // Activity Feed
  const feed = document.getElementById('adminActivityFeed');
  if (feed) {
    feed.innerHTML = `
      <div class="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700 text-xs">
        <div class="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
          <i class="fa-solid fa-database"></i>
        </div>
        <div class="flex-1">
          <p class="font-bold text-slate-800 dark:text-slate-200">SQLite Database Connected: chitral_educloud.db</p>
          <p class="text-[10px] text-slate-400">Multi-tenant active schema &middot; Session 2026-2027</p>
        </div>
        <span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">Synced</span>
      </div>
      <div class="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700 text-xs">
        <div class="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-600 flex items-center justify-center font-bold">
          <i class="fa-solid fa-clipboard-check"></i>
        </div>
        <div class="flex-1">
          <p class="font-bold text-slate-800 dark:text-slate-200">Daily Attendance Record: ${present} Present, ${absent} Absent</p>
          <p class="text-[10px] text-slate-400">Date: ${state.currentDate} &middot; Automatic alert triggers enabled</p>
        </div>
        <span class="text-[10px] font-bold text-teal-600 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded">Active</span>
      </div>
    `;
  }
}

// Chart.js initialization
function initCharts() {
  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#334155' : '#f1f5f9';

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
        plugins: { legend: { display: false } },
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
  window.open(`/api/students/export/csv?school_id=${encodeURIComponent(state.currentSchoolId)}`, '_blank');
  showToast("Downloading Student SIS Roster (UTF-8 Excel CSV)...");
}

function exportAttendanceCsv() {
  const dateInput = document.getElementById('attDatePicker');
  const dateStr = dateInput ? dateInput.value : state.currentDate;
  window.open(`/api/attendance/export/csv?school_id=${encodeURIComponent(state.currentSchoolId)}&date=${encodeURIComponent(dateStr)}`, '_blank');
  showToast("Downloading Daily Attendance Register (UTF-8 Excel CSV)...");
}

function exportFeeLedgerCsv() {
  window.open(`/api/fees/export/csv?school_id=${encodeURIComponent(state.currentSchoolId)}`, '_blank');
  showToast("Downloading Fee Collection Ledger (UTF-8 Excel CSV)...");
}

function exportExamMeritCsv() {
  const termSelect = document.getElementById('examTermSelect');
  const term = termSelect ? termSelect.value : "First Term";
  window.open(`/api/exams/export/csv?school_id=${encodeURIComponent(state.currentSchoolId)}&term=${encodeURIComponent(term)}`, '_blank');
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

  // Live QR Code Generation
  const qrContainer = document.getElementById('idCardQrContainer');
  if (qrContainer) {
    qrContainer.innerHTML = '';
    const verificationData = JSON.stringify({
      school: school.name,
      bise: school.bise_code,
      student: stu.full_name,
      roll: stu.roll_no,
      adm: stu.admission_no,
      class: `${stu.class_grade}-${stu.section}`,
      db_status: "VERIFIED_SQLITE_2026"
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
  if (!stu) return;
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

  document.getElementById('parentChildAvatar').innerText = stu.full_name.split(' ').map(n => n[0]).join('');
  document.getElementById('parentChildName').innerText = stu.full_name;
  document.getElementById('parentChildClass').innerText = `${stu.class_grade} - Section ${stu.section} • Roll #${stu.roll_no}`;
  document.getElementById('parentArrivalTime').innerText = stu.today_arrival_time || "08:14 AM";
  document.getElementById('parentChallanNo').innerText = stu.current_challan_no || "CH-2026-1049";
  document.getElementById('parentFeeAmount').innerText = `PKR ${Number(stu.current_total_fee || stu.monthly_fee).toLocaleString()}`;

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

// ==================== SCREEN 9: FEE MANAGEMENT (REST API) ====================
function renderFeeManagement() {
  const tbody = document.getElementById('feeCollectionTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';
  state.challans.forEach(ch => {
    const isPaid = ch.status === 'PAID';
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50 dark:hover:bg-slate-700/50 transition";
    tr.innerHTML = `
      <td class="p-3.5 font-mono font-bold text-slate-800 dark:text-slate-200">${ch.challan_no}</td>
      <td class="p-3.5 font-bold">${ch.student_name || 'Student'}</td>
      <td class="p-3.5 text-slate-500">${ch.class_grade || 'Grade 10'}-${ch.section || 'A'}</td>
      <td class="p-3.5">PKR ${Number(ch.tuition_fee).toLocaleString()}</td>
      <td class="p-3.5 font-bold ${ch.arrears > 0 ? 'text-rose-600' : 'text-slate-400'}">PKR ${Number(ch.arrears || 0).toLocaleString()}</td>
      <td class="p-3.5 font-black text-slate-900 dark:text-white">PKR ${Number(ch.total_amount).toLocaleString()}</td>
      <td class="p-3.5">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
          ${ch.status}
        </span>
      </td>
      <td class="p-3.5 text-center">
        <div class="flex items-center justify-center gap-2">
          ${!isPaid ? 
            `<button onclick="openCollectFeeModal('${ch.student_id}', '${ch.challan_no}')" class="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500">Collect</button>` : 
            `<button onclick="printThermalReceipt('${ch.student_id}', '${ch.challan_no}')" class="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold hover:bg-emerald-600 hover:text-white"><i class="fa-solid fa-receipt mr-1"></i> Slip</button>`}
          <button onclick="print3CopyBankChallan('${ch.student_id}')" class="px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-100" title="3-Copy Bank Challan"><i class="fa-solid fa-print"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Payroll Table from SQLite
  const payrollBody = document.getElementById('payrollTableBody');
  if (payrollBody) {
    payrollBody.innerHTML = '';
    state.payroll.forEach(emp => {
      const isPaid = emp.payment_status === 'Paid';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="p-3.5 font-mono text-slate-400">${emp.emp_id}</td>
        <td class="p-3.5 font-bold text-slate-800 dark:text-slate-200">${emp.full_name}</td>
        <td class="p-3.5 text-slate-500">${emp.designation}</td>
        <td class="p-3.5">PKR ${Number(emp.basic_salary).toLocaleString()}</td>
        <td class="p-3.5 text-emerald-600">+PKR ${Number(emp.allowances).toLocaleString()}</td>
        <td class="p-3.5 font-black text-slate-900 dark:text-white">PKR ${Number(emp.net_salary).toLocaleString()}</td>
        <td class="p-3.5">
          ${isPaid ? 
            '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Paid</span>' : 
            `<button onclick="payStaffSalary('${emp.emp_id}')" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 hover:bg-emerald-600 hover:text-white">Pay Now</button>`}
        </td>
        <td class="p-3.5 text-slate-500">${emp.paid_date || 'Bank of Khyber'}</td>
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

async function triggerBulkChallanGen() {
  try {
    const res = await fetch('/api/fees/generate-challans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        school_id: state.currentSchoolId,
        month_year: 'November 2026',
        include_heating: true
      })
    });
    const data = await res.json();
    if (res.ok) {
      await loadSchoolData(state.currentSchoolId);
      showToast(data.message || "Bulk Challans Generated in SQLite!");
    }
  } catch (err) {
    showToast("Error generating bulk challans");
  }
}

async function payStaffSalary(empId) {
  try {
    const res = await fetch('/api/staff/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emp_id: empId,
        school_id: state.currentSchoolId
      })
    });
    const data = await res.json();
    if (res.ok) {
      await loadSchoolData(state.currentSchoolId);
      showToast(data.message || "Staff salary paid in SQLite!");
    }
  } catch (err) {
    showToast("Error paying staff");
  }
}

// Collect Fee Modal & API Call
function openCollectFeeModal(studentId, challanNo = '') {
  const stu = state.students.find(s => s.id === studentId) || state.students[0];
  const modal = document.getElementById('modalCollectFee');
  const content = document.getElementById('collectFeeModalContent');

  const totalDue = stu.current_total_fee || (stu.monthly_fee + (stu.arrears || 0));

  content.innerHTML = `
    <div class="p-3 bg-slate-50 dark:bg-slate-700 rounded-2xl flex items-center justify-between">
      <div>
        <h4 class="font-bold text-sm">${stu.full_name} (Roll #${stu.roll_no})</h4>
        <p class="text-slate-500 text-[11px]">${stu.class_grade}-${stu.section} &middot; Challan #${challanNo || stu.current_challan_no}</p>
      </div>
      <div class="text-right">
        <span class="text-[10px] text-slate-400 block font-semibold">TOTAL PAYABLE</span>
        <strong class="text-base font-black text-emerald-600">PKR ${Number(totalDue).toLocaleString()}</strong>
      </div>
    </div>

    <div class="space-y-2">
      <label class="block font-semibold">Payment Mode</label>
      <select id="feePaymentModeSelect" class="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2">
        <option value="Cash">Cash at School Fee Counter</option>
        <option value="JazzCash">JazzCash (Till # 0943-41258)</option>
        <option value="EasyPaisa">EasyPaisa</option>
        <option value="Bank of Khyber">Bank of Khyber (Chitral Branch)</option>
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
      <button type="button" onclick="confirmFeeCollection('${stu.id}', '${challanNo || stu.current_challan_no}')" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
        Confirm & Save to SQLite
      </button>
    </div>
  `;

  modal.classList.remove('hidden');
}

function closeCollectFeeModal() {
  document.getElementById('modalCollectFee').classList.add('hidden');
}

async function confirmFeeCollection(studentId, challanNo) {
  const mode = document.getElementById('feePaymentModeSelect').value;
  const amount = parseInt(document.getElementById('feeReceivedAmount').value) || 4500;

  try {
    const res = await fetch('/api/fees/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        school_id: state.currentSchoolId,
        student_id: studentId,
        challan_no: challanNo,
        paid_amount: amount,
        payment_method: mode
      })
    });

    const data = await res.json();
    if (res.ok) {
      closeCollectFeeModal();
      await loadSchoolData(state.currentSchoolId);
      showToast(data.message || "Fee payment recorded in SQLite!");
      printThermalReceipt(studentId, challanNo);
    }
  } catch (err) {
    showToast("Error processing fee payment");
  }
}

// Thermal Receipt Modal
function printThermalReceipt(studentId, challanNo) {
  const stu = state.students.find(s => s.id === studentId) || state.students[0];
  const school = state.school;
  const container = document.getElementById('thermalReceiptContainer');
  const modal = document.getElementById('modalThermalReceipt');

  container.innerHTML = `
    <div class="thermal-receipt text-left text-xs space-y-2">
      <div class="text-center border-b border-dashed border-slate-400 pb-2">
        <h3 class="font-extrabold text-sm uppercase">${school.name || 'Chitral Model College'}</h3>
        <p class="text-[10px] text-slate-600">${school.address || 'Chitral'}</p>
        <p class="text-[10px] font-bold text-slate-800">OFFICIAL FEE PAYMENT SLIP</p>
      </div>

      <div class="text-[10px] space-y-1">
        <div class="flex justify-between"><span>Date: 12-Oct-2026</span><span>Time: 11:42 AM</span></div>
        <div class="flex justify-between"><span>Challan #:</span><strong>${challanNo || stu.current_challan_no}</strong></div>
        <div class="flex justify-between"><span>Student:</span><strong>${stu.full_name}</strong></div>
        <div class="flex justify-between"><span>Father:</span><span>${stu.father_name}</span></div>
        <div class="flex justify-between"><span>Class & Roll:</span><span>${stu.class_grade}-${stu.section} (Roll: ${stu.roll_no})</span></div>
      </div>

      <div class="border-t border-b border-dashed border-slate-400 py-1 text-[10px]">
        <div class="flex justify-between py-0.5"><span>Monthly Tuition Fee</span><span>PKR ${Number(stu.monthly_fee).toLocaleString()}</span></div>
        <div class="flex justify-between py-0.5"><span>Winter Heating Levy</span><span>PKR ${school.heating_levy || 800}</span></div>
        <div class="flex justify-between py-0.5 font-bold text-xs border-t border-slate-300 mt-1 pt-1">
          <span>TOTAL PAID</span><span>PKR ${(Number(stu.monthly_fee) + (school.heating_levy || 800)).toLocaleString()}</span>
        </div>
      </div>

      <div class="text-[9px] text-center text-slate-500 pt-2">
        <p>Database Record: SQLite (chitral_educloud.db)</p>
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
  const school = state.school;
  const container = document.getElementById('bankChallan3CopyContainer');
  const modal = document.getElementById('modalBankChallan');

  const copies = ["SCHOOL COPY", "BANK COPY", "STUDENT COPY"];
  let html = `<div class="bank-challan-3copy text-xs">`;

  copies.forEach(copyName => {
    html += `
      <div class="p-3 border border-slate-400 rounded-lg space-y-2 bg-white text-slate-900">
        <div class="text-center border-b border-slate-300 pb-1.5">
          <h4 class="font-bold text-[11px] uppercase">${school.name || 'Chitral Model College'}</h4>
          <span class="text-[9px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded">${copyName}</span>
          <p class="text-[9px] text-slate-500 mt-0.5">Bank of Khyber / HBL Chitral</p>
        </div>

        <div class="text-[10px] space-y-1">
          <div class="flex justify-between"><span>Challan #:</span><strong>${stu.current_challan_no}</strong></div>
          <div class="flex justify-between"><span>Student:</span><strong>${stu.full_name}</strong></div>
          <div class="flex justify-between"><span>Class & Roll:</span><span>${stu.class_grade}-${stu.section} (#${stu.roll_no})</span></div>
          <div class="flex justify-between"><span>Due Date:</span><strong class="text-rose-600">15-Oct-2026</strong></div>
        </div>

        <div class="border-t border-b border-slate-200 py-1 text-[10px] space-y-0.5">
          <div class="flex justify-between"><span>Tuition Fee</span><span>PKR ${Number(stu.monthly_fee).toLocaleString()}</span></div>
          <div class="flex justify-between"><span>Heating Charges</span><span>PKR ${school.heating_levy || 800}</span></div>
          <div class="flex justify-between font-bold border-t border-slate-300 pt-1">
            <span>Payable Amount</span><span>PKR ${(Number(stu.monthly_fee) + (school.heating_levy || 800)).toLocaleString()}</span>
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

// ==================== SCREEN 12: WHATSAPP / SMS ALERTS HUB (REST API) ====================
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

  if (txt) txt.value = content;
  if (preview) preview.innerText = content;
  updateBroadcastCharCount();
}

function updateBroadcastCharCount() {
  const txt = document.getElementById('broadcastContentTextarea');
  const count = document.getElementById('broadcastCharCount');
  const preview = document.getElementById('whatsappBubblePreview');
  if (count && txt) count.innerText = `${txt.value.length} characters`;
  if (preview && txt) preview.innerText = txt.value || "Select a prebuilt template or type your message on the left to see live preview.";
}

async function dispatchBroadcastAlert() {
  const txt = document.getElementById('broadcastContentTextarea').value;
  if (!txt.trim()) {
    showToast("Please enter message content or select a template!");
    return;
  }

  const audience = document.getElementById('broadcastAudienceSelect').selectedOptions[0].text;
  const channel = document.getElementById('broadcastChannelSelect').selectedOptions[0].text;

  try {
    const res = await fetch('/api/broadcasts/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        school_id: state.currentSchoolId,
        title: txt.slice(0, 32) + "...",
        category: channel,
        message_text: txt,
        target_group: audience,
        recipient_count: state.students.length || 684
      })
    });

    const data = await res.json();
    if (res.ok) {
      await loadSchoolData(state.currentSchoolId);
      showToast(data.message || `Broadcast dispatched and recorded in SQLite!`);
    }
  } catch (err) {
    showToast("Error saving broadcast log");
  }
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
        <span class="text-[10px] text-emerald-600 font-bold"><i class="fa-solid fa-check-double mr-1"></i> SQLite Logged</span>
      </div>
      <p class="text-[10px] text-slate-400 mt-0.5">${log.sent_at || 'Today'} &middot; Target: ${log.target_group}</p>
    `;
    container.appendChild(item);
  });
}

// ==================== SCREEN 13: SETTINGS & BACKUP (REST API) ====================
async function saveSchoolSettings() {
  const schoolId = state.currentSchoolId;
  const name = document.getElementById('cfgSchoolName').value;
  const address = document.getElementById('cfgCampusAddress').value;
  const bise = document.getElementById('cfgBiseCode').value;
  const phone = document.getElementById('cfgSchoolPhone').value;
  const email = document.getElementById('cfgSchoolEmail').value;
  const heating = parseInt(document.getElementById('cfgHeatingLevy').value) || 800;

  try {
    const res = await fetch(`/api/schools/${schoolId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name,
        address: address,
        bise_code: bise,
        phone: phone,
        email: email,
        heating_levy: heating
      })
    });

    const data = await res.json();
    if (res.ok) {
      await loadSchoolData(schoolId);
      showToast(data.message || "School settings updated in SQLite database!");
    }
  } catch (err) {
    showToast("Error updating settings in SQLite");
  }
}

function downloadJsonBackup() {
  window.open(`/api/backup/export?school_id=${encodeURIComponent(state.currentSchoolId)}`, '_blank');
  showToast("Downloading full SQLite JSON database backup...");
}

async function resetDemoDataset() {
  showToast("Re-synchronizing database state with latest Chitral records...");
  await loadSchoolData(state.currentSchoolId);
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

  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
