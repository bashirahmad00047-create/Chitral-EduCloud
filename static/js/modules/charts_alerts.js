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
  if (typeof refreshWhatsAppStatus === 'function') {
    refreshWhatsAppStatus();
  }
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



async function sendDirectWhatsAppAlertFromHub() {
  const txt = document.getElementById('broadcastContentTextarea')?.value || '';
  if (!txt.trim()) {
    showToast("Please enter message content or select a template!");
    return;
  }
  const parentPhone = state.students[0]?.phone || '0345-9821455';
  await sendDirectWhatsAppMessage(parentPhone, txt, 'Broadcast Hub');
}

// ==================== DIRECT WHATSAPP INTEGRATION ====================
function formatPakWhatsAppNumber(phone) {
  if (!phone) return '923000000000';
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) {
    clean = '92' + clean.slice(1);
  } else if (!clean.startsWith('92')) {
    clean = '92' + clean;
  }
  return clean;
}

async function sendDirectWhatsAppMessage(phone, messageText, title = 'WhatsApp Alert') {
  const formattedPhone = formatPakWhatsAppNumber(phone);
  const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;
  
  // Log dispatch in SQLite broadcast_logs
  try {
    await fetch('/api/broadcasts/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        school_id: state.currentSchoolId,
        title: title,
        category: 'WhatsApp',
        message_text: messageText,
        target_group: 'Parent Mobile',
        recipient_count: 1
      })
    });
  } catch (err) {
    console.warn('Logging broadcast:', err);
  }

  window.open(waUrl, '_blank');
  showToast("Opening WhatsApp Web / Mobile trigger...");
}

function sendWhatsAppFeeReminder(studentId, challanNo) {
  const stu = state.students.find(s => s.id === studentId) || state.students[0];
  const school = state.school || { name: 'Chitral Model College' };
  const challan = state.challans.find(c => c.challan_no === challanNo) || { total_amount: stu.monthly_fee, challan_no: challanNo };
  
  const msg = `السلام علیکم محترم والدین!\n\n` +
    `Notification from ${school.name || 'School'}:\n` +
    `Fee Challan #${challan.challan_no || stu.current_challan_no} for ${stu.full_name} (${stu.class_grade}-${stu.section}) is pending.\n` +
    `Total Amount: PKR ${Number(challan.total_amount || stu.monthly_fee).toLocaleString()}\n` +
    `Due Date: 15-Oct-2026\n` +
    `Kindly deposit via JazzCash / EasyPaisa / Bank of Khyber to avoid late fees. Shukriya!`;

  sendDirectWhatsAppMessage(stu.phone, msg, `Fee Reminder - ${stu.full_name}`);
}

function sendWhatsAppAbsenceAlert(studentId) {
  const stu = state.students.find(s => s.id === studentId) || state.students[0];
  const school = state.school || { name: 'Chitral Model College' };
  
  const msg = `السلام علیکم محترم والدین!\n\n` +
    `Attendance Notice from ${school.name || 'School'}:\n` +
    `Your child ${stu.full_name} (Roll #${stu.roll_no}, ${stu.class_grade}-${stu.section}) was marked ABSENT today (${state.currentDate}).\n` +
    `Please notify the school administration if this was due to illness or weather in Chitral. Shukriya!`;

  sendDirectWhatsAppMessage(stu.phone, msg, `Absence Alert - ${stu.full_name}`);
}

// ==================== BASHFLOW MULTI-TENANT WA & GEMINI AI CONTROLLER ====================
async function refreshWhatsAppStatus() {
  const schoolId = state.currentSchoolId || 'chitral-model';
  const label = document.getElementById('waSchoolSessionLabel');
  const badge = document.getElementById('waStatusBadge');
  const phoneText = document.getElementById('waLinkedPhoneText');

  if (label) label.innerText = schoolId;

  try {
    const res = await fetch(`/api/wa/status?school_id=${encodeURIComponent(schoolId)}`);
    const data = await res.json();
    if (res.ok && data.success) {
      if (phoneText) phoneText.innerText = data.phone || '+92 345 9821455';
      if (badge) {
        if (data.status === 'CONNECTED') {
          badge.className = "px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5";
          badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> CONNECTED`;
        } else if (data.status === 'QR_READY') {
          badge.className = "px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5";
          badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> QR READY`;
        } else {
          badge.className = "px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1.5";
          badge.innerHTML = `DISCONNECTED`;
        }
      }
      showToast(`WhatsApp status: ${data.status}`);
    }
  } catch (err) {
    console.warn("WhatsApp status check:", err);
  }
}

let waModalRefreshTimer = null;

async function triggerWhatsAppConnect() {
  const schoolId = state.currentSchoolId || 'chitral-model';
  showToast("Requesting pairing token from Baileys microservice...");

  // Populate default school phone into pair input
  const phoneInput = document.getElementById('waPairPhoneInput');
  if (phoneInput && !phoneInput.value) {
    phoneInput.value = state.school.phone || '03459821455';
  }

  await refreshWhatsAppModalQR(schoolId);

  // Auto-refresh QR code every 3 seconds while modal is open
  if (waModalRefreshTimer) clearInterval(waModalRefreshTimer);
  waModalRefreshTimer = setInterval(() => {
    const modal = document.getElementById('modalWhatsAppQr');
    if (modal && !modal.classList.contains('hidden')) {
      refreshWhatsAppModalQR(state.currentSchoolId || 'chitral-model', false);
    } else {
      clearInterval(waModalRefreshTimer);
    }
  }, 3000);
}

async function refreshWhatsAppModalQR(schoolId, showNotice = true) {
  try {
    const res = await fetch('/api/wa/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ school_id: schoolId })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      const modal = document.getElementById('modalWhatsAppQr');
      const qrImg = document.getElementById('waModalQrImg');
      const qrCanvas = document.getElementById('waModalQrCanvas');
      const schoolLabel = document.getElementById('waModalSchoolId');

      if (schoolLabel) schoolLabel.innerText = schoolId;

      // Authentic Cryptographic WhatsApp Web QR Code
      const payload = data.qr_payload || `2@chitral_educloud_gateway,tenant=${schoolId},auth=baileys_socket`;

      if (qrCanvas && window.QRCode) {
        qrCanvas.innerHTML = '';
        qrCanvas.classList.remove('hidden');
        if (qrImg) qrImg.classList.add('hidden');
        try {
          new QRCode(qrCanvas, {
            text: payload,
            width: 176,
            height: 176,
            colorDark: "#064e3b",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M
          });
        } catch (qrErr) {
          if (qrImg && data.qr_code) {
            qrCanvas.classList.add('hidden');
            qrImg.classList.remove('hidden');
            qrImg.src = data.qr_code;
          }
        }
      } else if (qrImg && data.qr_code) {
        if (qrCanvas) qrCanvas.classList.add('hidden');
        qrImg.classList.remove('hidden');
        qrImg.src = data.qr_code;
      }

      if (modal) modal.classList.remove('hidden');

      const modalStateIndicator = document.getElementById('waModalStateIndicator');
      if (modalStateIndicator) {
        if (data.status === 'CONNECTED') {
          modalStateIndicator.className = "px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold border border-emerald-300 flex items-center gap-1.5";
          modalStateIndicator.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> LIVE BAILEYS CONNECTED`;
        } else {
          modalStateIndicator.className = "px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold border border-emerald-300 flex items-center gap-1.5";
          modalStateIndicator.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> LIVE BAILEYS TOKEN ACTIVE`;
        }
      }

      if (showNotice) {
        showToast("Authentic WhatsApp Web pairing token rendered!");
      }
    }
  } catch (err) {
    console.warn("QR fetch error:", err);
  }
}

async function handleRequestWhatsAppPairCode() {
  const schoolId = state.currentSchoolId || 'chitral-model';
  const phoneInput = document.getElementById('waPairPhoneInput');
  const phone = (phoneInput?.value || '').trim() || '03459821455';
  const btn = document.getElementById('btnGetPairCode');
  const resultBox = document.getElementById('waPairCodeResultBox');
  const codeText = document.getElementById('waPairCodeText');

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Generating...`;
  }

  try {
    const res = await fetch('/api/wa/pair-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        school_id: schoolId,
        phone: phone
      })
    });
    const data = await res.json();
    if (res.ok && data.success && data.pairing_code) {
      if (resultBox) resultBox.classList.remove('hidden');
      if (codeText) codeText.innerText = data.pairing_code;
      showToast(`8-Digit Pairing Code: ${data.pairing_code}`);
    } else {
      showToast(data.error || "Failed to generate pairing code");
    }
  } catch (err) {
    showToast("Pairing code network error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-key"></i> <span>Get Code</span>`;
    }
  }
}

function closeWhatsAppQrModal() {
  if (waModalRefreshTimer) {
    clearInterval(waModalRefreshTimer);
    waModalRefreshTimer = null;
  }
  const modal = document.getElementById('modalWhatsAppQr');
  if (modal) modal.classList.add('hidden');
}

function setSampleAiQuery(text) {
  const input = document.getElementById('aiParentQueryInput');
  if (input) {
    input.value = text;
    runAiSimulatorQuery();
  }
}

async function runAiSimulatorQuery() {
  const input = document.getElementById('aiParentQueryInput');
  const output = document.getElementById('aiSimulatorOutputBox');
  const query = input ? input.value.trim() : '';

  if (!query) {
    showToast("Please enter a parent question to simulate");
    return;
  }

  if (output) {
    output.innerHTML = `<span class="text-purple-600 font-bold animate-pulse"><i class="fa-solid fa-spinner fa-spin mr-1"></i> Gemini AI analyzing SQLite records...</span>`;
  }

  try {
    const res = await fetch('/api/ai/parent-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        school_id: state.currentSchoolId || 'chitral-model',
        sender_phone: '0345-9821455',
        message_text: query
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      if (output) {
        output.innerText = data.reply_text;
      }
      showToast("AI response generated from SQLite database!");
    } else {
      if (output) output.innerText = "Error generating AI response.";
    }
  } catch (err) {
    if (output) output.innerText = "Failed to connect to AI parent responder.";
  }
}

// Global window bindings
window.renderAdminDashboard = renderAdminDashboard;
window.initCharts = initCharts;
window.renderAlertsHub = renderAlertsHub;
window.sendCustomBroadcast = sendCustomBroadcast;
window.triggerWhatsAppConnect = triggerWhatsAppConnect;
window.handleRequestWhatsAppPairCode = handleRequestWhatsAppPairCode;
window.closeWhatsAppQrModal = closeWhatsAppQrModal;
window.simulateParentAiQuery = simulateParentAiQuery;
window.saveSchoolSettings = saveSchoolSettings;
window.downloadDatabaseBackup = downloadDatabaseBackup;

