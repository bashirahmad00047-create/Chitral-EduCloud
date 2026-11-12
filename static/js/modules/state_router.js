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


async function checkAuthSession() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.authenticated && data.user) {
      state.currentUser = data.user;
      state.currentSchoolId = data.user.school_id || 'chitral-model';
      state.currentRole = data.user.role || 'admin';
      setGatewayMode(false);
      updateHeaderUserUI(data.user);
      await loadSchoolData(state.currentSchoolId);
      if (typeof applyRolePermissions === 'function') applyRolePermissions(state.currentRole);
      if (state.currentRole === 'teacher') switchTab('screen-teacher');
      else if (state.currentRole === 'parent') switchTab('screen-parent');
      else switchTab('screen-dashboard');
    } else {
      state.currentUser = null;
      setGatewayMode(true);
      await loadPublicSchools();
      switchTab('screen-login');
    }
  } catch (err) {
    console.warn("Auth check:", err);
    state.currentUser = null;
    setGatewayMode(true);
    await loadPublicSchools();
    switchTab('screen-login');
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
    state.lanIp = data.lan_ip || '10.154.203.239';
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

    const addOpt = document.createElement('option');
    addOpt.value = '__add_new__';
    addOpt.innerText = '➕ + Add New School...';
    select.appendChild(addOpt);

    select.onchange = (e) => {
      if (e.target.value === '__add_new__') {
        select.value = state.currentSchoolId;
        openAddSchoolModal();
      } else {
        switchSchool(e.target.value);
      }
    };
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

    const addCard = document.createElement('div');
    addCard.className = "p-4 rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/50 cursor-pointer flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs transition";
    addCard.onclick = () => openAddSchoolModal();
    addCard.innerHTML = `<i class="fa-solid fa-circle-plus text-base"></i> + Onboard New Campus`;
    loginCards.appendChild(addCard);
  }
}

function openAddSchoolModal() {
  const modal = document.getElementById('modalAddSchool');
  if (modal) modal.classList.remove('hidden');
}

function closeAddSchoolModal() {
  const modal = document.getElementById('modalAddSchool');
  if (modal) modal.classList.add('hidden');
  const form = document.getElementById('addSchoolForm');
  if (form) form.reset();
}

async function handleCreateSchool(e) {
  e.preventDefault();
  const name = document.getElementById('newSchoolName').value.trim();
  const city = document.getElementById('newSchoolCity').value.trim();
  const principal = document.getElementById('newSchoolPrincipal').value.trim();
  const phone = document.getElementById('newSchoolPhone').value.trim();
  const tuition = parseInt(document.getElementById('newSchoolTuition')?.value) || 4500;
  const adminUser = document.getElementById('newSchoolAdminUser')?.value.trim();
  const adminPass = document.getElementById('newSchoolAdminPass')?.value.trim() || 'admin123';

  try {
    const res = await fetch('/api/schools/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        campus_city: city,
        principal_name: principal,
        phone,
        default_monthly_fee: tuition,
        admin_username: adminUser,
        admin_password: adminPass
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      closeAddSchoolModal();
      showToast(data.message || `Campus '${name}' successfully registered!`);
      state.currentSchoolId = data.school.id;
      await loadSchoolData(data.school.id);
      navigateTo('screen-dashboard');
    } else {
      showToast(data.error || "Failed to onboard school campus");
    }
  } catch (err) {
    showToast("Network error creating school campus");
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

  // Strict Multi-Tenant Locked School Header Identity
  const lockedSchoolName = document.getElementById('lockedSchoolName');
  if (lockedSchoolName) lockedSchoolName.innerText = isUr && school.name_urdu ? school.name_urdu : (school.name || 'Chitral Model College');

  const lockedTenantId = document.getElementById('lockedTenantId');
  if (lockedTenantId) lockedTenantId.innerText = `🔒 ${school.id || state.currentSchoolId || 'chitral-model'}`;

  const lockedCampusCity = document.getElementById('lockedCampusCity');
  if (lockedCampusCity) lockedCampusCity.innerText = school.campus_city ? `${school.campus_city} Campus` : 'Chitral Campus';

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
async function setRole(role, syncBackend = true) {
  state.currentRole = role || 'admin';

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
    if (avatar) avatar.innerText = "AD";
    if (name) name.innerText = "Admin Rehmat";
    if (roleText) roleText.innerText = "Principal Desk";
  } else if (role === 'teacher') {
    if (avatar) avatar.innerText = "FA";
    if (name) name.innerText = "Sir Farooq Azam";
    if (roleText) roleText.innerText = "Faculty Specialist";
  } else if (role === 'parent') {
    if (avatar) avatar.innerText = "MW";
    if (name) name.innerText = "Mir Wazir Khan";
    if (roleText) roleText.innerText = "Guardian Portal";
  }

  // 1. Immediately apply client-side RBAC & unhide all 13 sidebar links for admin
  if (typeof applyRolePermissions === 'function') {
    applyRolePermissions(role);
  }

  // 2. Sync server-side session via /api/auth/switch-role
  if (syncBackend) {
    try {
      const res = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: role, school_id: state.currentSchoolId })
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        state.currentUser = data.user;
        updateHeaderUserUI(data.user);
      }
    } catch (err) {
      console.warn("Switch role error:", err);
    }
  }

  // 3. Navigate to active landing screen
  if (role === 'admin') {
    navigateTo('screen-dashboard');
  } else if (role === 'teacher') {
    navigateTo('screen-teacher');
  } else if (role === 'parent') {
    navigateTo('screen-parent');
  }

  showToast(`Switched to: ${role.toUpperCase()} Portal`);
}

function updateHeaderUserUI(user) {
  const avatar = document.getElementById('userAvatarText');
  const name = document.getElementById('userNameText');
  const roleText = document.getElementById('userRoleText');
  if (user && name) {
    if (user.role === 'admin') {
      name.innerText = user.full_name || "Admin Rehmat";
      if (roleText) roleText.innerText = "Principal Desk";
      if (avatar) avatar.innerText = "AD";
    } else if (user.role === 'teacher') {
      name.innerText = user.full_name || "Sir Farooq Azam";
      if (roleText) roleText.innerText = "Faculty Specialist";
      if (avatar) avatar.innerText = "FA";
    } else if (user.role === 'parent') {
      name.innerText = user.full_name || "Mir Wazir Khan";
      if (roleText) roleText.innerText = "Guardian Portal";
      if (avatar) avatar.innerText = "MW";
    }
  }
}

async function loginAsRole(role) {
  await setRole(role, true);
}

window.switchRole = setRole;
window.setRole = setRole;

// ==================== BASHFLOW-STYLE STRICT MULTI-TENANT GATEWAY CONTROLLERS ====================

function setGatewayMode(isGateway) {
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggleBtn');
  const authControls = document.getElementById('headerAuthenticatedControls');
  const gatewayControls = document.getElementById('headerGatewayControls');
  const tenantBadge = document.getElementById('headerTenantBadge');
  const mobileNav = document.getElementById('mobileBottomNav') || document.getElementById('bottomNav');

  if (isGateway) {
    if (sidebar) sidebar.classList.add('hidden');
    if (sidebarToggle) sidebarToggle.classList.add('hidden');
    if (authControls) {
      authControls.classList.add('hidden');
      authControls.classList.remove('flex');
    }
    if (gatewayControls) {
      gatewayControls.classList.remove('hidden');
      gatewayControls.classList.add('flex');
    }
    if (tenantBadge) {
      tenantBadge.classList.add('hidden');
      tenantBadge.classList.remove('md:flex');
    }
    if (mobileNav) mobileNav.classList.add('hidden');
  } else {
    if (sidebar) sidebar.classList.remove('hidden');
    if (sidebarToggle) sidebarToggle.classList.remove('hidden');
    if (authControls) {
      authControls.classList.remove('hidden');
      authControls.classList.add('flex');
    }
    if (gatewayControls) {
      gatewayControls.classList.add('hidden');
      gatewayControls.classList.remove('flex');
    }
    if (tenantBadge) {
      tenantBadge.classList.remove('hidden');
      tenantBadge.classList.add('md:flex');
    }
    if (mobileNav) mobileNav.classList.remove('hidden');
  }
}

async function loadPublicSchools() {
  try {
    const res = await fetch('/api/schools/public-list');
    if (!res.ok) return;
    const data = await res.json();
    if (data.schools && data.schools.length > 0) {
      const select = document.getElementById('gatewaySchoolSelect');
      if (select) {
        select.innerHTML = '';
        data.schools.forEach(school => {
          const opt = document.createElement('option');
          opt.value = school.id;
          opt.innerText = `${school.name} (${school.campus_city || 'Chitral'})`;
          if (school.id === state.currentSchoolId) opt.selected = true;
          select.appendChild(opt);
        });
      }
    }
  } catch (err) {
    console.warn("Public schools load error:", err);
  }
}

function switchGatewayTab(tab) {
  const paneLogin = document.getElementById('paneGatewayLogin');
  const paneRegister = document.getElementById('paneGatewayRegister');
  const btnLogin = document.getElementById('tabBtnLogin');
  const btnRegister = document.getElementById('tabBtnRegister');

  if (tab === 'register') {
    if (paneLogin) paneLogin.classList.add('hidden');
    if (paneRegister) paneRegister.classList.remove('hidden');
    if (btnRegister) {
      btnRegister.className = "flex-1 py-2.5 px-4 rounded-xl font-extrabold text-xs transition-all bg-white dark:bg-emerald-600 text-emerald-800 dark:text-white shadow-xs flex items-center justify-center gap-2";
    }
    if (btnLogin) {
      btnLogin.className = "flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition-all text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-white flex items-center justify-center gap-2";
    }
  } else {
    if (paneRegister) paneRegister.classList.add('hidden');
    if (paneLogin) paneLogin.classList.remove('hidden');
    if (btnLogin) {
      btnLogin.className = "flex-1 py-2.5 px-4 rounded-xl font-extrabold text-xs transition-all bg-white dark:bg-emerald-600 text-emerald-800 dark:text-white shadow-xs flex items-center justify-center gap-2";
    }
    if (btnRegister) {
      btnRegister.className = "flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition-all text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-white flex items-center justify-center gap-2";
    }
  }
}

function togglePasswordVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    if (icon) {
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
    }
  } else {
    input.type = 'password';
    if (icon) {
      icon.classList.remove('fa-eye-slash');
      icon.classList.add('fa-eye');
    }
  }
}

function fillQuickLogin(schoolId, role, username, password) {
  const schoolSelect = document.getElementById('gatewaySchoolSelect');
  if (schoolSelect) schoolSelect.value = schoolId;

  const roleSelect = document.getElementById('loginRoleSelect');
  if (roleSelect) roleSelect.value = role;

  const userInp = document.getElementById('loginUsername');
  if (userInp) userInp.value = username;

  const passInp = document.getElementById('loginPassword');
  if (passInp) passInp.value = password;

  showToast(`Autofilled credentials: ${username} (${schoolId})`);
}

function handleRegSchoolSelectChange(val) {
  const nameInp = document.getElementById('regSchoolName');
  const citySelect = document.getElementById('regCampusCity');
  const userInp = document.getElementById('regAdminUsername');

  if (!val || val === '__CUSTOM__') {
    if (nameInp) {
      nameInp.value = '';
      nameInp.focus();
    }
    return;
  }

  if (nameInp) nameInp.value = val;

  // Auto-detect Tehsil from school name
  if (citySelect) {
    if (val.includes('Booni')) citySelect.value = 'Booni';
    else if (val.includes('Drosh')) citySelect.value = 'Drosh';
    else if (val.includes('Mastuj')) citySelect.value = 'Mastuj';
    else if (val.includes('Garam Chashma')) citySelect.value = 'Garam Chashma';
    else if (val.includes('Torkhow')) citySelect.value = 'Torkhow';
    else if (val.includes('Mulkhow')) citySelect.value = 'Mulkhow';
    else citySelect.value = 'Chitral Town';
  }

  // Suggest clean admin username
  if (userInp) {
    const slug = val.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 18);
    userInp.value = `admin_${slug}`;
  }
}

async function handleDemoLogin(role, schoolId) {
  try {
    showToast(`Launching ${role.toUpperCase()} Workspace...`);
    const res = await fetch('/api/auth/demo-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: role || 'admin', school_id: schoolId || 'chitral-model' })
    });
    const data = await res.json();
    if (res.ok && data.success && data.user) {
      state.currentUser = data.user;
      state.currentSchoolId = data.user.school_id;
      state.currentRole = data.user.role;
      setGatewayMode(false);
      updateHeaderUserUI(data.user);
      await loadSchoolData(data.user.school_id);
      if (typeof applyRolePermissions === 'function') applyRolePermissions(data.user.role);
      
      if (data.user.role === 'teacher') switchTab('screen-teacher');
      else if (data.user.role === 'parent') switchTab('screen-parent');
      else switchTab('screen-dashboard');

      showToast(`Welcome! Logged into ${state.school.name || schoolId} (${data.user.full_name})`);
    } else {
      showToast(data.error || "Demo login failed");
    }
  } catch (err) {
    showToast("Authentication request error");
  }
}

function handleQuickDemoAccess() {
  handleDemoLogin('admin', 'chitral-model');
}

async function handleCredentialsLogin(e) {
  if (e && e.preventDefault) e.preventDefault();
  const schoolSelect = document.getElementById('gatewaySchoolSelect');
  const schoolId = schoolSelect ? schoolSelect.value : state.currentSchoolId;
  const username = (document.getElementById('loginUsername')?.value || '').trim();
  const password = (document.getElementById('loginPassword')?.value || '').trim();

  if (!username || !password) {
    showToast("Username and password are required");
    return;
  }

  const submitBtn = document.getElementById('btnLoginSubmit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...`;
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username,
        password: password,
        school_id: schoolId
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      state.currentUser = data.user;
      state.currentSchoolId = data.user.school_id;
      state.currentRole = data.user.role;
      setGatewayMode(false);
      updateHeaderUserUI(data.user);
      await loadSchoolData(data.user.school_id);
      if (typeof applyRolePermissions === 'function') applyRolePermissions(data.user.role);
      
      if (data.user.role === 'teacher') switchTab('screen-teacher');
      else if (data.user.role === 'parent') switchTab('screen-parent');
      else switchTab('screen-dashboard');

      showToast(data.message || `Welcome back, ${data.user.full_name}!`);
    } else {
      showToast(data.message || data.error || "Invalid username or password!");
    }
  } catch (err) {
    showToast("Authentication request failed");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i class="fa-solid fa-lock-open"></i> <span>Sign In to Isolated School Portal</span>`;
    }
  }
}

async function handleSchoolRegistration(e) {
  if (e && e.preventDefault) e.preventDefault();

  const name = (document.getElementById('regSchoolName')?.value || '').trim();
  const nameUrdu = (document.getElementById('regSchoolNameUrdu')?.value || '').trim();
  const campusCity = (document.getElementById('regCampusCity')?.value || 'Chitral Town').trim();
  const address = (document.getElementById('regAddress')?.value || '').trim();
  const biseCode = (document.getElementById('regBiseCode')?.value || '').trim();
  const principalName = (document.getElementById('regPrincipalName')?.value || '').trim();
  const phone = (document.getElementById('regPhone')?.value || '').trim();
  const monthlyFee = parseInt(document.getElementById('regMonthlyFee')?.value || 3500);
  const heatingLevy = parseInt(document.getElementById('regHeatingLevy')?.value || 700);
  const adminUsername = (document.getElementById('regAdminUsername')?.value || '').trim();
  const adminPassword = (document.getElementById('regAdminPassword')?.value || '').trim();

  if (!name || !adminUsername || !adminPassword) {
    showToast("Please fill in School Name and Admin Credentials");
    return;
  }

  const submitBtn = document.getElementById('btnRegisterSubmit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Provisioning School Workspace...`;
  }

  try {
    const res = await fetch('/api/schools/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name,
        name_urdu: nameUrdu,
        campus_city: campusCity,
        address: address,
        bise_code: biseCode,
        principal_name: principalName,
        phone: phone,
        default_monthly_fee: monthlyFee,
        heating_levy: heatingLevy,
        admin_username: adminUsername,
        admin_password: adminPassword
      })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      state.currentUser = data.user;
      state.currentSchoolId = data.school.id;
      state.currentRole = 'admin';
      setGatewayMode(false);
      updateHeaderUserUI(data.user);
      await loadSchoolData(data.school.id);
      if (typeof applyRolePermissions === 'function') applyRolePermissions('admin');
      switchTab('screen-dashboard');
      showToast(`🎉 School Workspace "${data.school.name}" is now live!`);
    } else {
      showToast(data.error || "Failed to register school");
    }
  } catch (err) {
    showToast("School registration network error");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>Register School Tenant & Launch ERP Workspace</span>`;
    }
  }
}

async function handleUserLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (err) {}
  state.currentUser = null;
  setGatewayMode(true);
  loadPublicSchools();
  switchTab('screen-login');
  showToast("Logged out of Chitral EduCloud ERP");
}

// ==================== BULLET-PROOF NAVIGATION ROUTER & COMMAND PALETTE ====================
function normalizeScreenId(id) {
  if (!id) return 'screen-dashboard';
  let clean = String(id).trim().replace(/^#/, '');
  if (!clean.startsWith('screen-')) {
    clean = 'screen-' + clean;
  }
  return clean;
}

function initNavigation() {
  const sidebarBtn = document.getElementById('sidebarToggleBtn');
  if (sidebarBtn) {
    sidebarBtn.addEventListener('click', toggleMobileSidebar);
  }

  // Bullet-proof event delegation: catches any click on [data-tab], [data-screen], or .nav-item
  document.addEventListener('click', (e) => {
    const navBtn = e.target.closest('[data-tab], [data-screen], .nav-item');
    if (navBtn) {
      const tabTarget = navBtn.getAttribute('data-tab') || navBtn.getAttribute('data-screen');
      if (tabTarget) {
        e.preventDefault();
        switchTab(tabTarget);
      }
    }
  });

  // Global Keyboard Shortcuts (Ctrl + K / Cmd + K for Command Palette, Esc to close)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openCommandPalette();
    } else if (e.key === 'Escape') {
      closeCommandPalette();
      closeAddSchoolModal();
      if (typeof closeAddStudentModal === 'function') closeAddStudentModal();
      if (typeof closeWhatsAppQrModal === 'function') closeWhatsAppQrModal();
      if (typeof closeBankChallanModal === 'function') closeBankChallanModal();
      if (typeof closeStudentCertModal === 'function') closeStudentCertModal();
      if (typeof closePromoteClassModal === 'function') closePromoteClassModal();
    }
  });
}

function toggleMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (sidebar) sidebar.classList.toggle('-translate-x-full');
  if (backdrop) backdrop.classList.toggle('hidden');
}

function switchTab(rawScreenId) {
  if (!rawScreenId) return;
  let screenId = normalizeScreenId(rawScreenId);

  // Strict Multi-Tenant Gateway Guard:
  // Unauthenticated visitors are strictly locked to screen-login
  if (!state.currentUser && screenId !== 'screen-login') {
    screenId = 'screen-login';
  }
  state.currentScreen = screenId;

  // 1. Hide all screens
  document.querySelectorAll('.screen-view').forEach(el => {
    el.classList.add('hidden');
  });

  // 2. Show target screen
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.remove('hidden');
  } else {
    console.warn(`Target screen element with id #${screenId} not found in DOM`);
  }

  // 3. Highlight active nav button using SaaS active class
  document.querySelectorAll('.nav-item').forEach(btn => {
    const btnTarget = btn.getAttribute('data-tab') || btn.getAttribute('data-screen');
    if (btnTarget && normalizeScreenId(btnTarget) === screenId) {
      btn.classList.add('nav-item-active', 'bg-emerald-50', 'dark:bg-slate-700', 'text-emerald-700', 'dark:text-emerald-400');
    } else {
      btn.classList.remove('nav-item-active', 'bg-emerald-50', 'dark:bg-slate-700', 'text-emerald-700', 'dark:text-emerald-400');
    }
  });

  // 4. Close mobile sidebar if open
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (sidebar && !sidebar.classList.contains('-translate-x-full') && window.innerWidth < 1024) {
    sidebar.classList.add('-translate-x-full');
    if (backdrop) backdrop.classList.add('hidden');
  }

  // 5. Render active screen content safely
  renderScreen(screenId);
  applyTranslations();

  const mainContent = document.getElementById('mainContent');
  if (mainContent) mainContent.scrollTop = 0;
}

// Alias navigateTo to switchTab for full backwards-compatibility
const navigateTo = switchTab;

function renderScreen(screenId) {
  try {
    switch (screenId) {
      case 'screen-dashboard':
        if (typeof renderAdminDashboard === 'function') renderAdminDashboard();
        break;
      case 'screen-students':
        if (typeof renderStudentsTable === 'function') renderStudentsTable();
        break;
      case 'screen-profile':
        if (typeof renderStudentProfile === 'function') renderStudentProfile(state.currentSelectedStudentId);
        break;
      case 'screen-idcard':
        if (typeof renderIdCardScreen === 'function') renderIdCardScreen();
        break;
      case 'screen-parent':
        if (typeof renderParentPortal === 'function') renderParentPortal();
        break;
      case 'screen-teacher':
        if (typeof renderTeacherWorkspace === 'function') renderTeacherWorkspace();
        break;
      case 'screen-attendance':
        if (typeof renderAttendanceSheet === 'function') renderAttendanceSheet();
        break;
      case 'screen-fees':
        if (typeof renderFeeManagement === 'function') renderFeeManagement();
        if (typeof renderCashbookSummary === 'function') renderCashbookSummary();
        break;
      case 'screen-exams':
        if (typeof renderExamMarksGrid === 'function') renderExamMarksGrid();
        break;
      case 'screen-dmc':
        if (typeof renderDmcScreen === 'function') renderDmcScreen();
        break;
      case 'screen-alerts':
        if (typeof renderAlertsHub === 'function') renderAlertsHub();
        break;
      case 'screen-settings':
        if (typeof updateSchoolHeaderUI === 'function') updateSchoolHeaderUI();
        break;
    }
  } catch (err) {
    console.error(`Safe recovery: Error rendering screen ${screenId}:`, err);
  }
}

// ==================== GLOBAL COMMAND PALETTE (Ctrl + K) ====================
function openCommandPalette() {
  const modal = document.getElementById('modalCommandPalette');
  const input = document.getElementById('commandPaletteInput');
  if (modal) {
    modal.classList.remove('hidden');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 50);
      filterCommandPalette('');
    }
  }
}

function closeCommandPalette() {
  const modal = document.getElementById('modalCommandPalette');
  if (modal) modal.classList.add('hidden');
}

function filterCommandPalette(q) {
  const container = document.getElementById('commandPaletteResults');
  if (!container) return;

  const query = (q || '').trim().toLowerCase();
  let html = '';

  // 1. Screens / Navigation Items
  const navScreens = [
    { id: 'screen-dashboard', name: 'Admin Dashboard', icon: 'fa-chart-pie', cat: 'Navigation' },
    { id: 'screen-students', name: 'Student SIS & Enrollment', icon: 'fa-users', cat: 'Academics' },
    { id: 'screen-fees', name: 'Fee Management & Quick Cashier Desk', icon: 'fa-cash-register', cat: 'Finance' },
    { id: 'screen-attendance', name: 'Daily Attendance Sheet', icon: 'fa-calendar-check', cat: 'Academics' },
    { id: 'screen-exams', name: 'Examination & Marks Entry', icon: 'fa-clipboard-list', cat: 'Academics' },
    { id: 'screen-dmc', name: 'Official Printable DMC Report Card', icon: 'fa-file-invoice', cat: 'Academics' },
    { id: 'screen-alerts', name: 'WhatsApp & SMS Hub (Baileys AI Bot)', icon: 'fa-whatsapp', cat: 'Communications' },
    { id: 'screen-teacher', name: 'Teacher Workspace & Diary', icon: 'fa-chalkboard-user', cat: 'Portals' },
    { id: 'screen-parent', name: 'Parent Mobile Portal', icon: 'fa-mobile-screen', cat: 'Portals' },
    { id: 'screen-idcard', name: 'Digital PVC ID Cards', icon: 'fa-qrcode', cat: 'SIS' },
    { id: 'screen-settings', name: 'School Campus Settings', icon: 'fa-sliders', cat: 'System' }
  ];

  const matchedScreens = navScreens.filter(s => 
    !query || s.name.toLowerCase().includes(query) || s.cat.toLowerCase().includes(query)
  );

  // 2. Matched Students
  const matchedStudents = (state.students || []).filter(s => 
    !query || (s.full_name && s.full_name.toLowerCase().includes(query)) ||
    (s.admission_no && s.admission_no.toLowerCase().includes(query)) ||
    (s.father_name && s.father_name.toLowerCase().includes(query))
  ).slice(0, 5);

  // Render Students section
  if (matchedStudents.length > 0) {
    html += `<div class="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Students (${matchedStudents.length})</div>`;
    matchedStudents.forEach(stu => {
      html += `
        <div onclick="handleCommandSelect('student', '${stu.id}')" class="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-slate-700/60 cursor-pointer transition">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xs font-bold">
              ${stu.full_name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <p class="text-xs font-bold text-slate-800 dark:text-slate-100">${stu.full_name} <span class="text-[10px] font-normal text-slate-400">(${stu.admission_no})</span></p>
              <p class="text-[10px] text-slate-400">Class: ${stu.class_grade}-${stu.section} &middot; Father: ${stu.father_name || '-'}</p>
            </div>
          </div>
          <span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">View Profile</span>
        </div>
      `;
    });
  }

  // Render Navigation section
  if (matchedScreens.length > 0) {
    html += `<div class="px-3 py-1.5 mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">ERP Screens (${matchedScreens.length})</div>`;
    matchedScreens.forEach(scr => {
      html += `
        <div onclick="handleCommandSelect('screen', '${scr.id}')" class="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 cursor-pointer transition">
          <div class="flex items-center gap-2.5">
            <i class="fa-solid ${scr.icon} w-5 text-center text-emerald-600"></i>
            <div>
              <p class="text-xs font-semibold text-slate-800 dark:text-slate-100">${scr.name}</p>
              <p class="text-[10px] text-slate-400">${scr.cat}</p>
            </div>
          </div>
          <kbd class="text-[9px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500 font-mono">Jump</kbd>
        </div>
      `;
    });
  }

  // Quick Actions Section
  if (!query || 'school new add student challan receipt'.includes(query)) {
    html += `
      <div class="px-3 py-1.5 mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Quick Actions</div>
      <div onclick="handleCommandSelect('action', 'new_school')" class="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 cursor-pointer transition">
        <i class="fa-solid fa-school text-emerald-600 w-5 text-center"></i>
        <span class="text-xs font-semibold text-slate-800 dark:text-slate-100">+ Register New School Tenant</span>
      </div>
      <div onclick="handleCommandSelect('action', 'new_student')" class="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 cursor-pointer transition">
        <i class="fa-solid fa-user-plus text-teal-600 w-5 text-center"></i>
        <span class="text-xs font-semibold text-slate-800 dark:text-slate-100">+ Register New Student</span>
      </div>
    `;
  }

  if (!html) {
    html = `<div class="p-6 text-center text-xs text-slate-400">No matching students or modules found for "${q}"</div>`;
  }

  container.innerHTML = html;
}

function handleCommandSelect(type, payload) {
  closeCommandPalette();
  if (type === 'screen') {
    navigateTo(payload);
  } else if (type === 'student') {
    state.currentSelectedStudentId = payload;
    navigateTo('screen-profile');
  } else if (type === 'action') {
    if (payload === 'new_school') openAddSchoolModal();
    else if (payload === 'new_student' && typeof openAddStudentModal === 'function') openAddStudentModal();
  }
}

// Role-Based Screen Access Control (RBAC)
const ROLE_PERMISSIONS = {
  admin: ['screen-dashboard', 'screen-teacher', 'screen-parent', 'screen-students', 'screen-profile', 'screen-idcard', 'screen-attendance', 'screen-exams', 'screen-dmc', 'screen-fees', 'screen-alerts', 'screen-settings', 'screen-login'],
  teacher: ['screen-teacher', 'screen-students', 'screen-attendance', 'screen-exams', 'screen-dmc', 'screen-profile', 'screen-idcard', 'screen-login'],
  parent: ['screen-parent', 'screen-idcard', 'screen-dmc', 'screen-fees', 'screen-login']
};

function applyRolePermissions(role) {
  const allowed = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.admin;
  document.querySelectorAll('.nav-item').forEach(btn => {
    const raw = btn.getAttribute('data-tab') || btn.getAttribute('data-screen');
    const screen = raw ? normalizeScreenId(raw) : null;
    if (screen && !allowed.includes(screen)) {
      btn.style.display = 'none';
    } else {
      btn.style.display = 'flex';
    }
  });
}

// ==================== GLOBAL WINDOW BINDINGS ====================
window.switchTab = switchTab;
window.navigateTo = switchTab;
window.normalizeScreenId = normalizeScreenId;
window.renderScreen = renderScreen;
window.setRole = setRole;
window.switchSchool = switchSchool;
window.openAddSchoolModal = openAddSchoolModal;
window.closeAddSchoolModal = closeAddSchoolModal;
window.openCommandPalette = openCommandPalette;
window.closeCommandPalette = closeCommandPalette;
window.filterCommandPalette = filterCommandPalette;
window.handleCommandSelect = handleCommandSelect;
window.toggleLanguage = toggleLanguage;
window.toggleTheme = toggleTheme;
window.toggleMobileSidebar = toggleMobileSidebar;
window.handleUserLogout = handleUserLogout;
window.loginAsRole = loginAsRole;
window.fillQuickLogin = fillQuickLogin;
window.handleRegSchoolSelectChange = handleRegSchoolSelectChange;
window.handleCredentialsLogin = handleCredentialsLogin;
window.handleSchoolRegistration = handleSchoolRegistration;
window.handleDemoLogin = handleDemoLogin;
window.handleQuickDemoAccess = handleQuickDemoAccess;
window.setGatewayMode = setGatewayMode;
window.loadPublicSchools = loadPublicSchools;
window.switchGatewayTab = switchGatewayTab;
window.togglePasswordVisibility = togglePasswordVisibility;
window.applyRolePermissions = applyRolePermissions;
window.loadSchoolData = loadSchoolData;
window.showToast = showToast;
window.initNavigation = initNavigation;
window.initTheme = initTheme;
window.checkAuthSession = checkAuthSession;

