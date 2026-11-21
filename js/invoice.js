
"use strict";

const invoiceState = {
  employees: [],
  records: [],
  selectedEmployee: null,
  startDate: "",
  endDate: "",
  totals: null
};

document.addEventListener("DOMContentLoaded", initializeInvoicePage);

async function initializeInvoicePage() {
  setDefaultDates();
  attachInvoiceEvents();
  await loadInvoiceEmployees();
}

function setDefaultDates() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  document.getElementById("startDate").value = toInputDate(firstDay);
  document.getElementById("endDate").value = toInputDate(today);
}

function toInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function attachInvoiceEvents() {
  document
    .getElementById("generateInvoiceBtn")
    .addEventListener("click", generateInvoice);

  document
    .getElementById("exportExcelBtn")
    .addEventListener("click", exportInvoiceToExcel);

  document
    .getElementById("exportPngBtn")
    .addEventListener("click", exportInvoiceToPng);

  document
    .getElementById("printInvoiceBtn")
    .addEventListener("click", printInvoice);

  document
    .getElementById("employeeSelect")
    .addEventListener("change", clearPreviousInvoice);

  document
    .getElementById("startDate")
    .addEventListener("change", clearPreviousInvoice);

  document
    .getElementById("endDate")
    .addEventListener("change", clearPreviousInvoice);
}

async function loadInvoiceEmployees() {
  const employeeSelect = document.getElementById("employeeSelect");

  try {
    employeeSelect.innerHTML =
      '<option value="">جاري تحميل الموظفين...</option>';

    const employees = await getEmployees();

    if (!Array.isArray(employees)) {
      throw new Error("بيانات الموظفين غير صحيحة.");
    }

    invoiceState.employees = employees;

    if (employees.length === 0) {
      employeeSelect.innerHTML =
        '<option value="">لا يوجد موظفون مسجلون</option>';
      return;
    }

    employeeSelect.innerHTML =
      '<option value="">اختر الموظف</option>';

    employees.forEach(employee => {
      const employeeID = employee.employeeID;
      const employeeName = employee.employeeName;

      if (employeeID === undefined || employeeID === null) {
        return;
      }

      const option = document.createElement("option");
      option.value = String(employeeID);
      option.textContent = employeeName || `موظف رقم ${employeeID}`;

      employeeSelect.appendChild(option);
    });

  } catch (error) {
    employeeSelect.innerHTML =
      '<option value="">تعذر تحميل الموظفين</option>';

    showInvoiceMessage(error.message, true);
  }
}

function clearPreviousInvoice() {
  invoiceState.records = [];
  invoiceState.selectedEmployee = null;
  invoiceState.totals = null;

  document.getElementById("invoicePaper").style.display = "none";

  setExportButtonsEnabled(false);
  hideInvoiceMessage();
}

async function generateInvoice() {
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;
  const employeeID = document.getElementById("employeeSelect").value;

  if (!startDate || !endDate || !employeeID) {
    showInvoiceMessage(
      "من فضلك حدد تاريخ البداية وتاريخ النهاية واختر الموظف.",
      true
    );
    return;
  }

  if (startDate > endDate) {
    showInvoiceMessage(
      "تاريخ البداية يجب أن يكون قبل تاريخ النهاية أو مساويًا له.",
      true
    );
    return;
  }

  const selectedEmployee = invoiceState.employees.find(
    employee => String(employee.employeeID) === String(employeeID)
  );

  if (!selectedEmployee) {
    showInvoiceMessage("الموظف المحدد غير موجود.", true);
    return;
  }

  const generateButton = document.getElementById("generateInvoiceBtn");

  try {
    generateButton.disabled = true;
    generateButton.textContent = "جاري إنشاء الفاتورة...";

    hideInvoiceMessage();
    setExportButtonsEnabled(false);

    document.getElementById("invoicePaper").style.display = "none";

    const result = await getShiftsByDateRange(
      startDate,
      endDate,
      employeeID
    );

    if (!result || result.success !== true) {
      throw new Error(
        result?.message || "تعذر تحميل بيانات الفاتورة."
      );
    }

    const records = Array.isArray(result.records)
      ? result.records
      : [];

    // حماية إضافية: لا نعرض بيانات موظف آخر
    // حتى لو رجعها الخادم بالخطأ.
    const employeeRecords = records.filter(
      record => String(record.employeeID) === String(employeeID)
    );

    invoiceState.records = employeeRecords;
    invoiceState.selectedEmployee = selectedEmployee;
    invoiceState.startDate = startDate;
    invoiceState.endDate = endDate;

    if (employeeRecords.length === 0) {
      showInvoiceMessage(
        "لا توجد ورديات لهذا الموظف خلال الفترة المحددة.",
        true
      );
      return;
    }

    renderInvoice();

    document.getElementById("invoicePaper").style.display = "block";

    setExportButtonsEnabled(true);

    showInvoiceMessage(
      `تم إنشاء الفاتورة بنجاح. عدد الورديات: ${employeeRecords.length}`,
      false
    );

  } catch (error) {
    showInvoiceMessage(
      error.message || "حدث خطأ أثناء إنشاء الفاتورة.",
      true
    );

  } finally {
    generateButton.disabled = false;
    generateButton.textContent = "إنشاء الفاتورة";
  }
}

function renderInvoice() {
  const employee = invoiceState.selectedEmployee;
  const records = invoiceState.records;

  const employeeName = employee.employeeName || "—";
  const employeeID = employee.employeeID;

  const periodText =
    `${formatDate(invoiceState.startDate)} - ${formatDate(invoiceState.endDate)}`;

  document.getElementById("invoicePeriod").textContent =
    `الفترة: ${periodText}`;

  document.getElementById("invoiceEmployeeName").textContent =
    `اسم الموظف: ${employeeName}`;

  document.getElementById("infoEmployeeName").textContent =
    employeeName;

  document.getElementById("infoEmployeeID").textContent =
    employeeID;

  document.getElementById("infoPeriod").textContent =
    periodText;

  const totals = calculateInvoiceTotals(records, employee);

  invoiceState.totals = totals;

  document.getElementById("attendanceDays").textContent =
    totals.attendanceDays;

  // لا يوجد حاليًا مصدر مستقل ومعتمد لحساب أيام الغياب.
  document.getElementById("absenceDays").textContent =
    "غير متاح";

  document.getElementById("hourlyRate").textContent =
    formatMoney(totals.hourlyRate);

  document.getElementById("totalEntitlements").textContent =
    formatMoney(totals.totalEntitlements);

  document.getElementById("totalDeductions").textContent =
    formatMoney(totals.totalDeductions);

  document.getElementById("netSalary").textContent =
    formatMoney(totals.netSalary);

  renderInvoiceTable(records, totals);
}

function calculateInvoiceTotals(records, employee) {
  const totals = {
    attendanceDays: 0,
    actualHours: 0,
    shiftHours: 0,
    shiftValue: 0,
    additionalAmount: 0,
    incentives: 0,
    lateDeduction: 0,
    earlyLeaveDeduction: 0,
    advances: 0,
    generalDeduction: 0,
    totalEntitlements: 0,
    totalDeductions: 0,
    netSalary: 0,
    hourlyRate: 0
  };

  let weightedRateTotal = 0;
  let totalRateHours = 0;

  records.forEach(record => {
    const actualMinutes = toNumber(record.actualDurationMinutes);
    const actualCheckIn = record.actualCheckIn;
    const actualCheckOut = record.actualCheckOut;

    if (
      actualMinutes > 0 ||
      (actualCheckIn && actualCheckOut)
    ) {
      totals.attendanceDays += 1;
    }

    const shiftHours = toNumber(record.shiftHours);
    const hourlyRate = toNumber(record.hourlyRate);

    totals.actualHours += actualMinutes / 60;
    totals.shiftHours += shiftHours;

    weightedRateTotal += hourlyRate * shiftHours;
    totalRateHours += shiftHours;

    totals.shiftValue += toNumber(record.shiftValue);
    totals.additionalAmount += toNumber(record.additionalAmount);
    totals.incentives += toNumber(record.incentives);
    totals.lateDeduction += toNumber(record.lateDeduction);
    totals.earlyLeaveDeduction += toNumber(record.earlyLeaveDeduction);
    totals.advances += toNumber(record.advances);
    totals.generalDeduction += toNumber(record.generalDeduction);

    totals.totalEntitlements +=
      toNumber(record.shiftValue) +
      toNumber(record.additionalAmount) +
      toNumber(record.incentives);

    totals.totalDeductions +=
      toNumber(record.lateDeduction) +
      toNumber(record.earlyLeaveDeduction) +
      toNumber(record.advances) +
      toNumber(record.generalDeduction);

    totals.netSalary += toNumber(record.totalAmount);
  });

  // متوسط مرجح لأجر الساعة حسب ساعات الورديات.
  // إذا لم تتوفر ساعات وردية، نستخدم أجر الموظف المسجل.
  if (totalRateHours > 0) {
    totals.hourlyRate = weightedRateTotal / totalRateHours;
  } else {
    totals.hourlyRate = toNumber(employee.hourlyRate);
  }

  return totals;
}

function renderInvoiceTable(records, totals) {
  const tbody = document.getElementById("invoiceTableBody");
  const tfoot = document.getElementById("invoiceTableFooter");

  tbody.innerHTML = "";
  tfoot.innerHTML = "";

  records.forEach(record => {
    const row = document.createElement("tr");

    const actualMinutes = toNumber(record.actualDurationMinutes);
    const actualHours = actualMinutes / 60;

    const values = [
      formatDate(record.shiftDate),
      record.dayName || getDayName(record.shiftDate),
      getShiftStatusLabel(record.status),
      formatInvoiceTime(record.actualCheckIn),
      formatInvoiceTime(record.actualCheckOut),
      actualHours.toFixed(2),
      toNumber(record.shiftHours).toFixed(2),
      formatMoney(record.shiftValue),
      formatMoney(record.additionalAmount),
      formatMoney(record.incentives),
      formatMoney(record.lateDeduction),
      formatMoney(record.earlyLeaveDeduction),
      formatMoney(record.advances),
      formatMoney(record.generalDeduction),
      formatMoney(record.totalAmount)
    ];

    values.forEach((value, index) => {
      const cell = document.createElement("td");
      cell.textContent = value;

      if (index === 14) {
        cell.classList.add("invoice-net-value");
      }

      row.appendChild(cell);
    });

    tbody.appendChild(row);
  });

  const totalRow = document.createElement("tr");

  const footerValues = [
    "الإجمالي",
    "—",
    "—",
    "—",
    "—",
    totals.actualHours.toFixed(2),
    totals.shiftHours.toFixed(2),
    formatMoney(totals.shiftValue),
    formatMoney(totals.additionalAmount),
    formatMoney(totals.incentives),
    formatMoney(totals.lateDeduction),
    formatMoney(totals.earlyLeaveDeduction),
    formatMoney(totals.advances),
    formatMoney(totals.generalDeduction),
    formatMoney(totals.netSalary)
  ];

  footerValues.forEach((value, index) => {
    const cell = document.createElement("td");
    cell.textContent = value;

    if (index === 0) {
      cell.colSpan = 1;
    }

    totalRow.appendChild(cell);
  });

  tfoot.appendChild(totalRow);
}

function exportInvoiceToExcel() {
  if (!invoiceState.records.length || !invoiceState.selectedEmployee) {
    showInvoiceMessage("أنشئ الفاتورة أولًا.", true);
    return;
  }

  if (typeof XLSX === "undefined") {
    showInvoiceMessage("تعذر تحميل مكتبة Excel. تحقق من اتصال الإنترنت.", true);
    return;
  }

  const employee = invoiceState.selectedEmployee;
  const totals = invoiceState.totals;

  const rows = invoiceState.records.map(record => ({
    "التاريخ": formatDate(record.shiftDate),
    "اليوم": record.dayName || getDayName(record.shiftDate),
    "الحالة": getShiftStatusLabel(record.status),
    "الحضور": formatInvoiceTime(record.actualCheckIn),
    "الانصراف": formatInvoiceTime(record.actualCheckOut),
    "ساعات العمل الفعلية": (toNumber(record.actualDurationMinutes) / 60).toFixed(2),
    "ساعات الوردية": toNumber(record.shiftHours),
    "قيمة الوردية": toNumber(record.shiftValue),
    "إضافي مالي": toNumber(record.additionalAmount),
    "الحوافز": toNumber(record.incentives),
    "خصم التأخير": toNumber(record.lateDeduction),
    "خصم الانصراف المبكر": toNumber(record.earlyLeaveDeduction),
    "السلف": toNumber(record.advances),
    "خصومات أخرى": toNumber(record.generalDeduction),
    "صافي الوردية": toNumber(record.totalAmount)
  }));

  rows.push({
    "التاريخ": "الإجمالي",
    "اليوم": "",
    "الحالة": "",
    "الحضور": "",
    "الانصراف": "",
    "ساعات العمل الفعلية": totals.actualHours,
    "ساعات الوردية": totals.shiftHours,
    "قيمة الوردية": totals.shiftValue,
    "إضافي مالي": totals.additionalAmount,
    "الحوافز": totals.incentives,
    "خصم التأخير": totals.lateDeduction,
    "خصم الانصراف المبكر": totals.earlyLeaveDeduction,
    "السلف": totals.advances,
    "خصومات أخرى": totals.generalDeduction,
    "صافي الوردية": totals.netSalary
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!views"] = [{ rightToLeft: true }];

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "فاتورة الموظف"
  );

  const fileName =
    `فاتورة_${safeFileName(employee.employeeName)}_` +
    `${invoiceState.startDate}_${invoiceState.endDate}.xlsx`;

  XLSX.writeFile(workbook, fileName);

  showInvoiceMessage("تم تصدير ملف Excel بنجاح.", false);
}

async function exportInvoiceToPng() {
  const invoicePaper = document.getElementById("invoicePaper");

  if (
    !invoiceState.records.length ||
    !invoiceState.selectedEmployee
  ) {
    showInvoiceMessage("أنشئ الفاتورة أولًا.", true);
    return;
  }

  if (typeof html2canvas === "undefined") {
    showInvoiceMessage("تعذر تحميل مكتبة تصدير الصور. تحقق من اتصال الإنترنت.", true);
    return;
  }

  try {
    const canvas = await html2canvas(invoicePaper, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      width: invoicePaper.scrollWidth,
      windowWidth: invoicePaper.scrollWidth
    });

    const link = document.createElement("a");

    link.download =
      `فاتورة_${safeFileName(invoiceState.selectedEmployee.employeeName)}_` +
      `${invoiceState.startDate}_${invoiceState.endDate}.png`;

    link.href = canvas.toDataURL("image/png");
    link.click();

    showInvoiceMessage("تم تصدير صورة الفاتورة بنجاح.", false);

  } catch (error) {
    showInvoiceMessage(
      "حدث خطأ أثناء تصدير الصورة: " + error.message,
      true
    );
  }
}

function printInvoice() {
  if (!invoiceState.records.length) {
    showInvoiceMessage("أنشئ الفاتورة أولًا.", true);
    return;
  }

  window.print();
}

function setExportButtonsEnabled(enabled) {
  document.getElementById("exportExcelBtn").disabled = !enabled;
  document.getElementById("exportPngBtn").disabled = !enabled;
  document.getElementById("printInvoiceBtn").disabled = !enabled;
}

function showInvoiceMessage(message, isError) {
  const element = document.getElementById("invoiceMessage");

  element.textContent = message;
  element.classList.toggle("error", Boolean(isError));
  element.style.display = "block";
}

function hideInvoiceMessage() {
  const element = document.getElementById("invoiceMessage");

  element.textContent = "";
  element.style.display = "none";
  element.classList.remove("error");
}

function toNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function formatMoney(value) {
  return `${toNumber(value).toFixed(2)} ج.م`;
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const text = String(value);

  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return text;
  }

  return new Intl.DateTimeFormat("en-GB").format(date);
}

function formatInvoiceTime(value) {
  if (!value) {
    return "—";
  }

  // تحويل Date إلى توقيت القاهرة.
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return "—";
    }

    return formatTimeInCairo(value);
  }

  const text = String(value).trim();

  // ISO timestamp يحتوي على تاريخ ووقت.
  // مثال: 1899-12-30T03:54:51.000Z
  const isoMatch = text.match(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/
  );

  if (isoMatch) {
    const date = new Date(text);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return formatTimeInCairo(date);
  }

  // وقت مباشر بدون تاريخ أو timezone.
  // مثال: 06:00:00 أو 6:00
  const directMatch = text.match(
    /^(\d{1,2}):(\d{2})(?::\d{2})?$/
  );

  if (directMatch) {
    return `${directMatch[1].padStart(2, "0")}:${directMatch[2]}`;
  }

  return text;
}

function formatTimeInCairo(date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(date);
}

function getDayName(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("ar-EG", {
    weekday: "long"
  }).format(date);
}

function getShiftStatusLabel(status) {
  if (!status) {
    return "—";
  }

  const labels = {
    PRESENT: "حاضر",
    ABSENT: "غائب",
    LATE: "متأخر",
    EARLY_LEAVE: "انصراف مبكر",
    COMPLETED: "مكتملة",
    PENDING: "قيد المراجعة",
    APPROVED: "معتمدة",
    REJECTED: "مرفوضة",
    "حاضر": "حاضر",
    "غائب": "غائب"
  };

  return labels[String(status).toUpperCase()] || String(status);
}

function safeFileName(value) {
  return String(value || "الموظف")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_");
}
