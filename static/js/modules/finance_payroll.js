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
            `<button onclick="openCollectFeeModal('${ch.student_id}', '${ch.challan_no}')" class="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500">Collect</button>
             <button onclick="sendWhatsAppFeeReminder('${ch.student_id}', '${ch.challan_no}')" class="px-2 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-lg text-[10px] font-bold hover:bg-emerald-600 hover:text-white transition" title="Send Fee Reminder via WhatsApp"><i class="fa-brands fa-whatsapp text-emerald-500 text-xs mr-0.5"></i> WA</button>` : 
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

// ==================== ADVANCED ITEMIZED FEE COLLECTION WORKFLOW ====================
let lastCollectedFeeDetails = null;

function openCollectFeeModal(studentId, challanNo = '') {
  const stu = state.students.find(s => s.id === studentId) || state.students[0];
  const modal = document.getElementById('modalCollectFee');
  const content = document.getElementById('collectFeeModalContent');
  const school = state.school || {};

  const ch = state.challans.find(c => c.challan_no === challanNo || c.student_id === studentId) || {};
  const tuition = Number(stu.monthly_fee) || 4500;
  const heating = Number(school.heating_levy) || 800;
  const arrears = Number(ch.arrears || stu.arrears || 0);
  const currentTotal = tuition + heating + arrears;

  content.innerHTML = `
    <!-- Student Header Summary -->
    <div class="p-3.5 bg-slate-50 dark:bg-slate-700/60 rounded-2xl border border-slate-200 dark:border-slate-600 flex flex-wrap items-center justify-between gap-3">
      <div>
        <div class="flex items-center gap-2">
          <h4 class="font-bold text-sm text-slate-900 dark:text-white">${stu.full_name}</h4>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">Roll #${stu.roll_no}</span>
          <span class="text-slate-400 dark:text-slate-400 text-xs">(${stu.class_grade}-${stu.section})</span>
        </div>
        <p class="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
          Guardian: <strong>${stu.father_name}</strong> &middot; WhatsApp: <strong>${stu.phone}</strong> &middot; Adm #${stu.admission_no}
        </p>
      </div>
      <div class="text-right">
        <span class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Challan / Voucher #</span>
        <strong class="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">${challanNo || ch.challan_no || stu.current_challan_no || 'CH-2026-AUTO'}</strong>
      </div>
    </div>

    <!-- Interactive Itemized Fee Heads Table -->
    <div class="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-800">
      <div class="bg-slate-100 dark:bg-slate-700/80 px-3.5 py-2 flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
        <span>FEE HEAD DESCRIPTION</span>
        <span>AMOUNT (PKR)</span>
      </div>
      <div class="divide-y divide-slate-100 dark:divide-slate-700/50 p-2 space-y-1">
        <!-- Monthly Tuition -->
        <div class="flex items-center justify-between py-1.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-700/40 rounded-lg">
          <label class="flex items-center gap-2 cursor-pointer font-medium text-slate-800 dark:text-slate-200 text-xs">
            <input type="checkbox" id="itemTuitionCheck" checked onchange="recalculateItemizedFee()" class="rounded text-emerald-600 focus:ring-emerald-500">
            <span>Monthly Tuition Fee</span>
          </label>
          <input type="number" id="itemTuitionAmt" value="${tuition}" oninput="recalculateItemizedFee()" class="w-24 text-right bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 font-bold text-xs">
        </div>

        <!-- Winter Heating Fuel Levy -->
        <div class="flex items-center justify-between py-1.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-700/40 rounded-lg">
          <label class="flex items-center gap-2 cursor-pointer font-medium text-slate-800 dark:text-slate-200 text-xs">
            <input type="checkbox" id="itemHeatingCheck" checked onchange="recalculateItemizedFee()" class="rounded text-emerald-600 focus:ring-emerald-500">
            <span>Winter Heating Fuel Levy (Chitral)</span>
          </label>
          <input type="number" id="itemHeatingAmt" value="${heating}" oninput="recalculateItemizedFee()" class="w-24 text-right bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 font-bold text-xs">
        </div>

        <!-- Exam & DMC Printing -->
        <div class="flex items-center justify-between py-1.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-700/40 rounded-lg">
          <label class="flex items-center gap-2 cursor-pointer font-medium text-slate-800 dark:text-slate-200 text-xs">
            <input type="checkbox" id="itemExamCheck" onchange="recalculateItemizedFee()" class="rounded text-emerald-600 focus:ring-emerald-500">
            <span>BISE / Term Examination & DMC</span>
          </label>
          <input type="number" id="itemExamAmt" value="500" oninput="recalculateItemizedFee()" class="w-24 text-right bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 font-bold text-xs">
        </div>

        <!-- Science & Computer Lab -->
        <div class="flex items-center justify-between py-1.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-700/40 rounded-lg">
          <label class="flex items-center gap-2 cursor-pointer font-medium text-slate-800 dark:text-slate-200 text-xs">
            <input type="checkbox" id="itemLabCheck" onchange="recalculateItemizedFee()" class="rounded text-emerald-600 focus:ring-emerald-500">
            <span>Computer & Science Lab Maintenance</span>
          </label>
          <input type="number" id="itemLabAmt" value="300" oninput="recalculateItemizedFee()" class="w-24 text-right bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 font-bold text-xs">
        </div>

        <!-- Previous Arrears -->
        <div class="flex items-center justify-between py-1.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-700/40 rounded-lg">
          <label class="flex items-center gap-2 cursor-pointer font-medium text-rose-600 dark:text-rose-400 text-xs">
            <input type="checkbox" id="itemArrearsCheck" ${arrears > 0 ? 'checked' : ''} onchange="recalculateItemizedFee()" class="rounded text-rose-600 focus:ring-rose-500">
            <span>Outstanding Previous Arrears</span>
          </label>
          <input type="number" id="itemArrearsAmt" value="${arrears}" oninput="recalculateItemizedFee()" class="w-24 text-right bg-slate-50 dark:bg-slate-700 border border-rose-300 dark:border-rose-700 rounded-lg px-2 py-1 font-bold text-xs text-rose-600">
        </div>

        <!-- Late Fee Surcharge -->
        <div class="flex items-center justify-between py-1.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-700/40 rounded-lg">
          <label class="flex items-center gap-2 cursor-pointer font-medium text-amber-600 dark:text-amber-400 text-xs">
            <input type="checkbox" id="itemLateFineCheck" onchange="recalculateItemizedFee()" class="rounded text-amber-600 focus:ring-amber-500">
            <span>Late Payment Surcharge / Fine</span>
          </label>
          <input type="number" id="itemLateFineAmt" value="200" oninput="recalculateItemizedFee()" class="w-24 text-right bg-slate-50 dark:bg-slate-700 border border-amber-300 dark:border-amber-700 rounded-lg px-2 py-1 font-bold text-xs text-amber-600">
        </div>

        <!-- Concession / Waiver -->
        <div class="flex items-center justify-between py-1.5 px-2 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg border border-dashed border-emerald-300 dark:border-emerald-800">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-tag text-emerald-600 text-xs"></i>
            <span class="font-bold text-emerald-800 dark:text-emerald-300 text-xs">Concession / Sibling Waiver:</span>
            <select id="feeConcessionType" class="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-1.5 py-0.5 text-[10px]">
              <option value="Kinship">Kinship / Sibling</option>
              <option value="Merit">Academic Merit</option>
              <option value="Need">Financial Assistance</option>
              <option value="Staff">Teacher Ward</option>
            </select>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-emerald-700 font-bold text-xs">- PKR</span>
            <input type="number" id="itemConcessionAmt" value="0" min="0" oninput="recalculateItemizedFee()" class="w-20 text-right bg-white dark:bg-slate-700 border border-emerald-300 dark:border-emerald-700 rounded-lg px-2 py-1 font-bold text-xs text-emerald-700">
          </div>
        </div>
      </div>
    </div>

    <!-- Live Accounting Calculation Banner -->
    <div class="p-3 bg-gradient-to-r from-slate-900 to-emerald-950 text-white rounded-2xl flex items-center justify-between shadow-sm">
      <div>
        <span class="text-[10px] text-slate-300 font-semibold block uppercase">Itemized Total Payable</span>
        <div class="flex items-baseline gap-2">
          <strong id="feeCalculatedTotalText" class="text-lg font-black text-emerald-400">PKR ${currentTotal.toLocaleString()}</strong>
          <span id="feeCalculatedSubtotalNote" class="text-[10px] text-slate-400">(Subtotal: PKR ${currentTotal.toLocaleString()})</span>
        </div>
      </div>
      <div class="text-right">
        <span class="text-[10px] text-slate-300 font-semibold block uppercase">Remaining Balance</span>
        <strong id="feeRemainingBalanceText" class="text-base font-black text-white">PKR 0</strong>
      </div>
    </div>

    <!-- Payment Mode & Received Amount -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Payment Channel</label>
        <select id="feePaymentModeSelect" class="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-xs font-semibold">
          <option value="Cash">Cash at School Fee Counter</option>
          <option value="JazzCash">JazzCash (Till / Merchant Account)</option>
          <option value="EasyPaisa">EasyPaisa Mobile Account</option>
          <option value="Bank of Khyber">Bank of Khyber (Chitral Branch)</option>
        </select>
      </div>
      <div>
        <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Amount Received (PKR) *</label>
        <input type="number" id="feeReceivedAmount" value="${currentTotal}" oninput="recalculateItemizedFee()" class="w-full bg-white dark:bg-slate-700 border-2 border-emerald-500 rounded-xl px-3 py-2 font-black text-sm text-emerald-600 text-right">
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Bank / Trx Voucher Reference</label>
        <input type="text" id="feeReceiptRef" value="TRX-${Date.now().toString().slice(-6)}" class="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 font-mono text-xs">
      </div>
      <div>
        <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Cashier Remarks / Notes</label>
        <input type="text" id="feeReceiptRemarks" placeholder="e.g. Paid in full at counter" class="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-xs">
      </div>
    </div>

    <!-- Automated Notification Triggers -->
    <div class="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-600 space-y-1.5">
      <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200">
        <input type="checkbox" id="feeAutoWhatsAppCheck" checked class="rounded text-emerald-600 focus:ring-emerald-500">
        <span class="flex items-center gap-1.5">
          <i class="fa-brands fa-whatsapp text-emerald-500 text-sm"></i>
          Auto-send WhatsApp Official Receipt to Guardian (${stu.phone})
        </span>
      </label>
      <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200">
        <input type="checkbox" id="feeAutoThermalCheck" checked class="rounded text-emerald-600 focus:ring-emerald-500">
        <span class="flex items-center gap-1.5">
          <i class="fa-solid fa-receipt text-slate-500 text-sm"></i>
          Immediately open 80mm POS Thermal Slip Preview
        </span>
      </label>
    </div>

    <!-- Action Footer -->
    <div class="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
      <button type="button" onclick="closeCollectFeeModal()" class="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-semibold text-xs">Cancel</button>
      <button type="button" onclick="confirmFeeCollection('${stu.id}', '${challanNo || ch.challan_no || stu.current_challan_no || ''}')" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-2 shadow-sm transition">
        <i class="fa-solid fa-check"></i> Confirm Payment &amp; Record in SQLite
      </button>
    </div>
  `;

  modal.classList.remove('hidden');
}

function recalculateItemizedFee() {
  let subtotal = 0;
  if (document.getElementById('itemTuitionCheck')?.checked) {
    subtotal += Number(document.getElementById('itemTuitionAmt')?.value) || 0;
  }
  if (document.getElementById('itemHeatingCheck')?.checked) {
    subtotal += Number(document.getElementById('itemHeatingAmt')?.value) || 0;
  }
  if (document.getElementById('itemExamCheck')?.checked) {
    subtotal += Number(document.getElementById('itemExamAmt')?.value) || 0;
  }
  if (document.getElementById('itemLabCheck')?.checked) {
    subtotal += Number(document.getElementById('itemLabAmt')?.value) || 0;
  }
  if (document.getElementById('itemArrearsCheck')?.checked) {
    subtotal += Number(document.getElementById('itemArrearsAmt')?.value) || 0;
  }
  if (document.getElementById('itemLateFineCheck')?.checked) {
    subtotal += Number(document.getElementById('itemLateFineAmt')?.value) || 0;
  }

  const concession = Number(document.getElementById('itemConcessionAmt')?.value) || 0;
  const netTotal = Math.max(0, subtotal - concession);

  const totalText = document.getElementById('feeCalculatedTotalText');
  if (totalText) totalText.innerText = `PKR ${netTotal.toLocaleString()}`;

  const noteText = document.getElementById('feeCalculatedSubtotalNote');
  if (noteText) noteText.innerText = `(Subtotal: PKR ${subtotal.toLocaleString()} ${concession > 0 ? `- Discount: ${concession}` : ''})`;

  const receivedInput = document.getElementById('feeReceivedAmount');
  const received = Number(receivedInput?.value) || 0;
  const balance = Math.max(0, netTotal - received);

  const balText = document.getElementById('feeRemainingBalanceText');
  if (balText) {
    balText.innerText = `PKR ${balance.toLocaleString()}`;
    balText.className = balance > 0 ? "text-base font-black text-rose-400" : "text-base font-black text-emerald-400";
  }
}

function closeCollectFeeModal() {
  document.getElementById('modalCollectFee').classList.add('hidden');
}

async function confirmFeeCollection(studentId, challanNo) {
  const mode = document.getElementById('feePaymentModeSelect')?.value || 'Cash';
  const receivedInput = document.getElementById('feeReceivedAmount');
  const paidAmount = Number(receivedInput?.value) || 0;
  const ref = document.getElementById('feeReceiptRef')?.value || `TRX-${Date.now().toString().slice(-6)}`;
  const remarks = document.getElementById('feeReceiptRemarks')?.value || 'Paid in full';
  const autoWa = document.getElementById('feeAutoWhatsAppCheck')?.checked;
  const autoThermal = document.getElementById('feeAutoThermalCheck')?.checked;

  // Calculate itemized breakdown
  const tuitionAmt = document.getElementById('itemTuitionCheck')?.checked ? (Number(document.getElementById('itemTuitionAmt')?.value) || 0) : 0;
  const heatingAmt = document.getElementById('itemHeatingCheck')?.checked ? (Number(document.getElementById('itemHeatingAmt')?.value) || 0) : 0;
  const examAmt = document.getElementById('itemExamCheck')?.checked ? (Number(document.getElementById('itemExamAmt')?.value) || 0) : 0;
  const labAmt = document.getElementById('itemLabCheck')?.checked ? (Number(document.getElementById('itemLabAmt')?.value) || 0) : 0;
  const arrearsAmt = document.getElementById('itemArrearsCheck')?.checked ? (Number(document.getElementById('itemArrearsAmt')?.value) || 0) : 0;
  const lateFineAmt = document.getElementById('itemLateFineCheck')?.checked ? (Number(document.getElementById('itemLateFineAmt')?.value) || 0) : 0;
  const concessionAmt = Number(document.getElementById('itemConcessionAmt')?.value) || 0;
  const concessionType = document.getElementById('feeConcessionType')?.value || 'Sibling';

  const totalCalculated = Math.max(0, (tuitionAmt + heatingAmt + examAmt + labAmt + arrearsAmt + lateFineAmt) - concessionAmt);

  try {
    const res = await fetch('/api/fees/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        school_id: state.currentSchoolId,
        student_id: studentId,
        challan_no: challanNo,
        paid_amount: paidAmount,
        total_amount: totalCalculated,
        payment_method: mode
      })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      closeCollectFeeModal();
      await loadSchoolData(state.currentSchoolId);
      showToast(data.message || "Fee payment recorded in SQLite!");

      // Save itemized details for thermal receipt & WA
      const stu = state.students.find(s => s.id === studentId) || {};
      lastCollectedFeeDetails = {
        challanNo: data.challan_no || challanNo,
        studentName: stu.full_name || 'Student',
        rollNo: stu.roll_no || '101',
        classGrade: stu.class_grade || 'Grade 10',
        section: stu.section || 'A',
        fatherName: stu.father_name || 'Guardian',
        phone: stu.phone || '0345-0000000',
        tuitionAmt,
        heatingAmt,
        examAmt,
        labAmt,
        arrearsAmt,
        lateFineAmt,
        concessionAmt,
        concessionType,
        totalPayable: totalCalculated,
        paidAmount,
        balance: data.new_balance || 0,
        paymentMethod: data.payment_method || mode,
        receiptRef: ref,
        remarks
      };

      // Auto-dispatch WhatsApp Receipt if enabled
      if (autoWa && stu.phone) {
        dispatchWhatsAppFeeReceipt(stu.phone, lastCollectedFeeDetails);
      }

      // Open Thermal Receipt if enabled
      if (autoThermal) {
        printThermalReceipt(studentId, data.challan_no || challanNo, lastCollectedFeeDetails);
      }
    } else {
      showToast(data.error || "Failed to record fee payment");
    }
  } catch (err) {
    showToast("Error processing fee payment");
  }
}

// Auto-dispatch WhatsApp Receipt via /api/wa/send-direct
async function dispatchWhatsAppFeeReceipt(phone, details) {
  const school = state.school || {};
  const msg = `*OFFICIAL FEE PAYMENT RECEIPT*\n` +
    `*${school.name || 'Chitral Model College'}*\n` +
    `Receipt Ref: ${details.receiptRef}\n` +
    `Challan #: ${details.challanNo}\n` +
    `Student: ${details.studentName} (Roll #${details.rollNo})\n` +
    `Class: ${details.classGrade}-${details.section}\n` +
    `--------------------------\n` +
    `• Monthly Tuition: PKR ${details.tuitionAmt.toLocaleString()}\n` +
    (details.heatingAmt > 0 ? `• Winter Heating: PKR ${details.heatingAmt.toLocaleString()}\n` : '') +
    (details.examAmt > 0 ? `• Exam & DMC: PKR ${details.examAmt.toLocaleString()}\n` : '') +
    (details.labAmt > 0 ? `• Lab Charges: PKR ${details.labAmt.toLocaleString()}\n` : '') +
    (details.arrearsAmt > 0 ? `• Previous Arrears: PKR ${details.arrearsAmt.toLocaleString()}\n` : '') +
    (details.concessionAmt > 0 ? `• Concession (${details.concessionType}): -PKR ${details.concessionAmt.toLocaleString()}\n` : '') +
    `--------------------------\n` +
    `*TOTAL PAID: PKR ${details.paidAmount.toLocaleString()}*\n` +
    `Remaining Balance: PKR ${details.balance.toLocaleString()}\n` +
    `Channel: ${details.paymentMethod}\n` +
    `Thank you for trusting Chitral EduCloud!`;

  try {
    await fetch('/api/wa/send-direct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        school_id: state.currentSchoolId,
        phone: phone,
        message: msg
      })
    });
    showToast(`WhatsApp receipt sent to ${phone}`);
  } catch (e) {
    console.warn("Auto WA Receipt error:", e);
  }
}

// Thermal Receipt Modal (Enhanced 80mm Itemized Slip)
function printThermalReceipt(studentId, challanNo, details = null) {
  const stu = state.students.find(s => s.id === studentId) || state.students[0];
  const school = state.school || {};
  const container = document.getElementById('thermalReceiptContainer');
  const modal = document.getElementById('modalThermalReceipt');

  const d = details || lastCollectedFeeDetails || {
    challanNo: challanNo || stu.current_challan_no || 'CH-2026-1049',
    studentName: stu.full_name,
    rollNo: stu.roll_no,
    classGrade: stu.class_grade,
    section: stu.section,
    fatherName: stu.father_name,
    tuitionAmt: stu.monthly_fee || 4500,
    heatingAmt: school.heating_levy || 800,
    examAmt: 0,
    labAmt: 0,
    arrearsAmt: 0,
    concessionAmt: 0,
    totalPayable: (stu.monthly_fee || 4500) + (school.heating_levy || 800),
    paidAmount: (stu.monthly_fee || 4500) + (school.heating_levy || 800),
    balance: 0,
    paymentMethod: 'Cash',
    receiptRef: `TRX-${Date.now().toString().slice(-6)}`
  };

  container.innerHTML = `
    <div class="thermal-receipt text-left text-xs space-y-2 p-2 bg-white text-slate-900 font-mono">
      <div class="text-center border-b border-dashed border-slate-400 pb-2">
        <h3 class="font-extrabold text-sm uppercase">${school.name || 'Chitral Model College'}</h3>
        <p class="text-[10px] text-slate-600">${school.address || 'Chitral Town, KP'}</p>
        <p class="text-[9px] text-slate-500 font-semibold">${school.bise_code || 'BISE Peshawar'}</p>
        <div class="inline-block mt-1 px-2 py-0.5 bg-slate-900 text-white text-[9px] font-bold rounded">OFFICIAL CASH REGISTER VOUCHER</div>
      </div>

      <div class="text-[10px] space-y-0.5 pt-1">
        <div class="flex justify-between"><span>Date: ${new Date().toLocaleDateString('en-GB')}</span><span>Time: ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>
        <div class="flex justify-between"><span>Voucher Ref:</span><strong>${d.receiptRef}</strong></div>
        <div class="flex justify-between"><span>Challan #:</span><strong>${d.challanNo}</strong></div>
        <div class="flex justify-between"><span>Student:</span><strong>${d.studentName}</strong></div>
        <div class="flex justify-between"><span>Father:</span><span>${d.fatherName}</span></div>
        <div class="flex justify-between"><span>Class & Roll:</span><span>${d.classGrade}-${d.section} (Roll: ${d.rollNo})</span></div>
      </div>

      <div class="border-t border-b border-dashed border-slate-400 py-1.5 text-[10px] space-y-0.5">
        <div class="flex justify-between py-0.5"><span>Monthly Tuition Fee</span><span>PKR ${d.tuitionAmt.toLocaleString()}</span></div>
        ${d.heatingAmt > 0 ? `<div class="flex justify-between py-0.5"><span>Winter Heating Levy</span><span>PKR ${d.heatingAmt.toLocaleString()}</span></div>` : ''}
        ${d.examAmt > 0 ? `<div class="flex justify-between py-0.5"><span>Exam & DMC Fee</span><span>PKR ${d.examAmt.toLocaleString()}</span></div>` : ''}
        ${d.labAmt > 0 ? `<div class="flex justify-between py-0.5"><span>Computer / Science Lab</span><span>PKR ${d.labAmt.toLocaleString()}</span></div>` : ''}
        ${d.arrearsAmt > 0 ? `<div class="flex justify-between py-0.5 text-rose-600"><span>Previous Arrears</span><span>PKR ${d.arrearsAmt.toLocaleString()}</span></div>` : ''}
        ${d.concessionAmt > 0 ? `<div class="flex justify-between py-0.5 text-emerald-700"><span>Concession (${d.concessionType || 'Waiver'})</span><span>-PKR ${d.concessionAmt.toLocaleString()}</span></div>` : ''}
        <div class="flex justify-between py-1 font-bold text-xs border-t border-slate-300 mt-1 pt-1">
          <span>NET AMOUNT PAID</span><span>PKR ${d.paidAmount.toLocaleString()}</span>
        </div>
        <div class="flex justify-between text-[9px] text-slate-600">
          <span>Remaining Balance:</span><strong>PKR ${d.balance.toLocaleString()}</strong>
        </div>
        <div class="flex justify-between text-[9px] text-slate-600">
          <span>Payment Channel:</span><span>${d.paymentMethod}</span>
        </div>
      </div>

      <div class="pt-2 flex justify-between text-[9px] border-b border-dashed border-slate-300 pb-2">
        <div>
          <p class="text-slate-400">Cashier Signature:</p>
          <div class="h-6 border-b border-dotted border-slate-400 w-24 mt-1"></div>
        </div>
        <div class="text-right">
          <p class="text-slate-400">Depositor Signature:</p>
          <div class="h-6 border-b border-dotted border-slate-400 w-24 mt-1"></div>
        </div>
      </div>

      <div class="text-[9px] text-center text-slate-500 pt-1">
        <p>Database Record: SQLite (chitral_educloud.db)</p>
        <p class="font-bold text-slate-700">Thank you for supporting quality education in Chitral.</p>
        <p class="font-mono mt-0.5">*** CHITRAL EDUCLOUD POS 80MM ***</p>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
}

function closeThermalReceiptModal() {
  document.getElementById('modalThermalReceipt').classList.add('hidden');
}

function printThermalSlip() {
  document.body.classList.add('printing-receipt');
  window.print();
  setTimeout(() => {
    document.body.classList.remove('printing-receipt');
  }, 1000);
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

function print3CopyChallanDoc() {
  document.body.classList.add('printing-bank-challan');
  window.print();
  setTimeout(() => {
    document.body.classList.remove('printing-bank-challan');
  }, 1000);
}

