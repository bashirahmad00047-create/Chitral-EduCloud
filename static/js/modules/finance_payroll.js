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

