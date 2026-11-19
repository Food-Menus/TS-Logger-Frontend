
/**
 * EMPLOYEE INVOICE PAGE
 */

const invoiceState = {
  records: [],
  filteredRecords: [],
  startDate: "",
  endDate: "",
  employeeID: "",
  employeeName: ""
};

const invoiceElements = {
  startDate: document.getElementById("startDate"),
  endDate: document.getElementById("endDate"),
  employeeSelect: document.getElementById("employeeSelect"),

  generateBtn: document.getElementById("generateInvoiceBtn"),
  excelBtn: document.getElementById("exportExcelBtn"),
  pngBtn: document.getElementById("exportPngBtn"),
  printBtn: document.getElementById("printInvoiceBtn"),

  message: document.getElementById("invoiceMessage"),
  container: document.getElementById("invoiceContainer"),
  empty: document.getElementById("invoiceEmpty"),
  paper: document.getElementById("invoicePaper"),

  period: document.getElementById("invoicePeriod"),
  employee: document.getElementById("invoiceEmployee"),
  employeeID: document.getElementById("invoiceEmployeeID"),

  attendanceDays: document.getElementById("attendanceDays"),
  absenceDays: document.getElementById("absenceDays"),
  hourlyRate: document.getElementById("hourlyRate"),
  totalEntitlements: document.getElementById("totalEntitlements"),
  totalDeductions: document.getElementById("totalDeductions"),
  netSalary: document.getElementById("netSalary"),

  tableBody: document.getElementById("invoiceTableBody"),
  tableFoot: document.getElementById("invoiceTableFoot"),
  generatedAt: document.getElementById("invoiceGeneratedAt")
};


document.addEventListener("DOMContentLoaded", initializeInvoicePage);


/**
 * Initialize page.
 */
function initializeInvoicePage() {
  const today = getLocalDateString();
  const firstDay = today.slice(0, 8) + "01";

  invoiceElements.startDate.value = firstDay;
  invoiceElements.endDate.value = today;

  invoiceElements.generateBtn.addEventListener(
    "click",
    generateInvoice
  );

  invoiceElements.excelBtn.addEventListener(
    "click",
    exportInvoiceExcel
  );

  invoiceElements.pngBtn.addEventListener(
    "click",
    exportInvoicePNG
  );

  invoiceElements.printBtn.addEventListener(
    "click",
    printInvoice
  );
}


/**
 * Generate invoice from selected filters.
 */
async function generateInvoice() {
  const startDate = invoiceElements.startDate.value;
  const endDate = invoiceElements.endDate.value;
  const employeeID = invoiceElements.employeeSelect.value;

  if (!startDate || !endDate) {
    showInvoiceMessage("من فضلك اختر تاريخ البداية والنهاية.", "error");
    return;
  }

  if (startDate > endDate) {
    showInvoiceMessage(
      "تاريخ البداية يجب أن يكون قبل تاريخ النهاية.",
      "error"
    );
    return;
  }

  setInvoiceLoading(true);

  invoiceElements.container.classList.add("hidden");
  invoiceElements.empty.classList.remove("hidden");

  invoiceElements.empty.textContent = "جاري إنشاء الفاتورة...";

  try {
    const result = await getShiftsByDateRange(
      startDate,
      endDate,
      employeeID
    );

    invoiceState.records = result.records || [];
    invoiceState.startDate = startDate;
    invoiceState.endDate = endDate;
    invoiceState.employeeID = employeeID;

    updateEmployeeOptions(invoiceState.records);

    // Keep the selected employee after rebuilding options.
    invoiceElements.employeeSelect.value = employeeID;

    invoiceState.filteredRecords = invoiceState.records;

    if (!invoiceState.filteredRecords.length) {
      invoiceElements.empty.textContent =
        "لا توجد شيفتات مسجلة للبيانات المحددة.";

      disableExportButtons();

      showInvoiceMessage(
        "لم يتم العثور على شيفتات في الفترة المحددة.",
        "info"
      );

      return;
    }

    renderInvoice(invoiceState.filteredRecords);

    invoiceElements.container.classList.remove("hidden");
    invoiceElements.empty.classList.add("hidden");

    enableExportButtons();
    hideInvoiceMessage();

  } catch (error) {
    invoiceElements.empty.textContent =
      "تعذر إنشاء الفاتورة.";

    showInvoiceMessage(error.message, "error");

    disableExportButtons();

  } finally {
    setInvoiceLoading(false);
  }
}


/**
 * Update employee dropdown from loaded shifts.
 */
function updateEmployeeOptions(records) {
  const selectedValue = invoiceElements.employeeSelect.value;

  const employees = {};

  records.forEach(record => {
    const id = String(record.employeeID || "").trim();

    if (!id) return;

    employees[id] = record.employeeName || id;
  });

  const employeeList = Object.keys(employees).sort((a, b) =>
    String(employees[a]).localeCompare(
      String(employees[b]),
      "ar"
    )
  );

  invoiceElements.employeeSelect.innerHTML =
    '<option value="">كل الموظفين</option>' +
    employeeList.map(id => {
      return `
        <option value="${escapeInvoiceHTML(id)}">
          ${escapeInvoiceHTML(employees[id])}
        </option>
      `;
    }).join("");

  if (employeeList.includes(selectedValue)) {
    invoiceElements.employeeSelect.value = selectedValue;
  }
}


/**
 * Render complete invoice.
 */
function renderInvoice(records) {
  if (!records.length) return;

  const firstRecord = records[0];

  const employeeName = invoiceState.employeeID
    ? firstRecord.employeeName
    : "كل الموظفين";

  const employeeID = invoiceState.employeeID || "—";

  const totals = calculateInvoiceTotals(records);

  invoiceState.employeeName = employeeName;

  invoiceElements.period.textContent =
    `${invoiceState.startDate} إلى ${invoiceState.endDate}`;

  invoiceElements.employee.textContent = employeeName;
  invoiceElements.employeeID.textContent = employeeID;

  invoiceElements.attendanceDays.textContent =
    String(totals.attendanceDays);

  invoiceElements.absenceDays.textContent =
    "غير متاح";

  invoiceElements.hourlyRate.textContent =
    formatInvoiceMoney(totals.hourlyRate);

  invoiceElements.totalEntitlements.textContent =
    formatInvoiceMoney(totals.entitlements);

  invoiceElements.totalDeductions.textContent =
    formatInvoiceMoney(totals.deductions);

  invoiceElements.netSalary.textContent =
    formatInvoiceMoney(totals.netSalary);

  renderInvoiceRows(records, totals);

  invoiceElements.generatedAt.textContent =
    "تاريخ الإصدار: " +
    new Date().toLocaleString("ar-EG");
}


/**
 * Calculate invoice totals.
 */
function calculateInvoiceTotals(records) {
  const totals = {
    attendanceDays: 0,
    hourlyRate: 0,
    shiftHours: 0,
    actualHours: 0,
    shiftValue: 0,
    additionalAmount: 0,
    incentives: 0,
    lateDeduction: 0,
    earlyLeaveDeduction: 0,
    advances: 0,
    generalDeduction: 0,
    entitlements: 0,
    deductions: 0,
    netSalary: 0
  };

  records.forEach(record => {
    const actualMinutes =
      Number(record.actualDurationMinutes) || 0;

    const hasAttendance =
      actualMinutes > 0 ||
      hasTimeValue(record.actualCheckIn) ||
      hasTimeValue(record.actualCheckOut);

    if (hasAttendance) {
      totals.attendanceDays++;
    }

    totals.hourlyRate += Number(record.hourlyRate) || 0;

    totals.shiftHours += Number(record.shiftHours) || 0;

    totals.actualHours += actualMinutes / 60;

    totals.shiftValue += Number(record.shiftValue) || 0;

    totals.additionalAmount +=
      Number(record.additionalAmount) || 0;

    totals.incentives += Number(record.incentives) || 0;

    totals.lateDeduction +=
      Number(record.lateDeduction) || 0;

    totals.earlyLeaveDeduction +=
      Number(record.earlyLeaveDeduction) || 0;

    totals.advances += Number(record.advances) || 0;

    totals.generalDeduction +=
      Number(record.generalDeduction) || 0;

    totals.netSalary += Number(record.totalAmount) || 0;
  });

  totals.entitlements =
    totals.shiftValue +
    totals.additionalAmount +
    totals.incentives;

  totals.deductions =
    totals.lateDeduction +
    totals.earlyLeaveDeduction +
    totals.advances +
    totals.generalDeduction;

  Object.keys(totals).forEach(key => {
    if (typeof totals[key] === "number") {
      totals[key] = roundInvoiceMoney(totals[key]);
    }
  });

  return totals;
}


/**
 * Render invoice table.
 */
function renderInvoiceRows(records, totals) {
  invoiceElements.tableBody.innerHTML = records.map(record => {
    const actualHours =
      (Number(record.actualDurationMinutes) || 0) / 60;

    return `
      <tr>
        <td>${escapeInvoiceHTML(record.shiftDate)}</td>

        <td>${escapeInvoiceHTML(
          record.dayName || getArabicDayName(record.shiftDate)
        )}</td>

        <td>${escapeInvoiceHTML(
          getShiftStatusLabel(record.status)
        )}</td>

        <td>${escapeInvoiceHTML(
          formatInvoiceTime(record.actualCheckIn)
        )}</td>

        <td>${escapeInvoiceHTML(
          formatInvoiceTime(record.actualCheckOut)
        )}</td>

        <td>${formatInvoiceNumber(actualHours)}</td>

        <td>${formatInvoiceNumber(record.shiftHours)}</td>

        <td>${formatInvoiceNumber(record.shiftValue)}</td>

        <td>${formatInvoiceNumber(record.additionalAmount)}</td>

        <td>${formatInvoiceNumber(record.incentives)}</td>

        <td>${formatInvoiceNumber(record.lateDeduction)}</td>

        <td>${formatInvoiceNumber(record.earlyLeaveDeduction)}</td>

        <td>${formatInvoiceNumber(record.advances)}</td>

        <td>${formatInvoiceNumber(record.generalDeduction)}</td>

        <td><strong>${formatInvoiceNumber(record.totalAmount)}</strong></td>
      </tr>
    `;
  }).join("");

  invoiceElements.tableFoot.innerHTML = `
    <tr>
      <td colspan="5">الإجمالي</td>
      <td>${formatInvoiceNumber(totals.actualHours)}</td>
      <td>${formatInvoiceNumber(totals.shiftHours)}</td>
      <td>${formatInvoiceNumber(totals.shiftValue)}</td>
      <td>${formatInvoiceNumber(totals.additionalAmount)}</td>
      <td>${formatInvoiceNumber(totals.incentives)}</td>
      <td>${formatInvoiceNumber(totals.lateDeduction)}</td>
      <td>${formatInvoiceNumber(totals.earlyLeaveDeduction)}</td>
      <td>${formatInvoiceNumber(totals.advances)}</td>
      <td>${formatInvoiceNumber(totals.generalDeduction)}</td>
      <td>${formatInvoiceNumber(totals.netSalary)}</td>
    </tr>
  `;
}


/**
 * Export invoice to Excel.
 */
function exportInvoiceExcel() {
  if (!invoiceState.filteredRecords.length) return;

  if (typeof XLSX === "undefined") {
    showInvoiceMessage(
      "تعذر تحميل مكتبة Excel. تأكد من اتصال الإنترنت.",
      "error"
    );
    return;
  }

  const records = invoiceState.filteredRecords;
  const totals = calculateInvoiceTotals(records);

  const rows = [
    ["TS Logger - كشف حساب موظف"],
    ["الموظف", invoiceState.employeeName],
    ["كود الموظف", invoiceState.employeeID || "كل الموظفين"],
    ["من تاريخ", invoiceState.startDate],
    ["إلى تاريخ", invoiceState.endDate],
    [],
    ["الملخص المالي"],
    ["أيام الحضور", totals.attendanceDays],
    ["أيام الغياب", "غير متاح"],
    ["سعر الساعة", totals.hourlyRate],
    ["إجمالي المستحقات", totals.entitlements],
    ["إجمالي الخصومات", totals.deductions],
    ["صافي الراتب", totals.netSalary],
    [],
    [
      "التاريخ",
      "اليوم",
      "الحالة",
      "الحضور",
      "الانصراف",
      "ساعات العمل الفعلية",
      "ساعات الشيفت",
      "قيمة الشيفت",
      "إضافي",
      "حوافز",
      "خصم تأخير",
      "خصم انصراف مبكر",
      "سلف",
      "خصومات أخرى",
      "الصافي"
    ]
  ];

  records.forEach(record => {
    rows.push([
      record.shiftDate,
      record.dayName || getArabicDayName(record.shiftDate),
      getShiftStatusLabel(record.status),
      formatInvoiceTime(record.actualCheckIn),
      formatInvoiceTime(record.actualCheckOut),
      roundInvoiceMoney(
        (Number(record.actualDurationMinutes) || 0) / 60
      ),
      Number(record.shiftHours) || 0,
      Number(record.shiftValue) || 0,
      Number(record.additionalAmount) || 0,
      Number(record.incentives) || 0,
      Number(record.lateDeduction) || 0,
      Number(record.earlyLeaveDeduction) || 0,
      Number(record.advances) || 0,
      Number(record.generalDeduction) || 0,
      Number(record.totalAmount) || 0
    ]);
  });

  rows.push([
    "الإجمالي",
    "",
    "",
    "",
    "",
    totals.actualHours,
    totals.shiftHours,
    totals.shiftValue,
    totals.additionalAmount,
    totals.incentives,
    totals.lateDeduction,
    totals.earlyLeaveDeduction,
    totals.advances,
    totals.generalDeduction,
    totals.netSalary
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  worksheet["!cols"] = [
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 12 },
    { wch: 12 },
    { wch: 18 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 15 },
    { wch: 19 },
    { wch: 12 },
    { wch: 15 },
    { wch: 15 }
  ];

  worksheet["!views"] = [
    { rightToLeft: true }
  ];

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "كشف الحساب"
  );

  const fileName =
    `Invoice_${invoiceState.employeeID || "All"}_` +
    `${invoiceState.startDate}_${invoiceState.endDate}.xlsx`;

  XLSX.writeFile(workbook, fileName);

  showInvoiceMessage("تم تصدير ملف Excel بنجاح.", "success");
}


/**
 * Export invoice as PNG.
 */
async function exportInvoicePNG() {
  if (!invoiceState.filteredRecords.length) return;

  if (typeof html2canvas === "undefined") {
    showInvoiceMessage(
      "تعذر تحميل مكتبة الصور. تأكد من اتصال الإنترنت.",
      "error"
    );
    return;
  }

  invoiceElements.pngBtn.disabled = true;
  invoiceElements.pngBtn.textContent = "جاري تجهيز الصورة...";

  try {
    const canvas = await html2canvas(
      invoiceElements.paper,
      {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false
      }
    );

    const link = document.createElement("a");

    link.download =
      `Invoice_${invoiceState.employeeID || "All"}_` +
      `${invoiceState.startDate}_${invoiceState.endDate}.png`;

    link.href = canvas.toDataURL("image/png");

    link.click();

    showInvoiceMessage("تم تصدير صورة الفاتورة بنجاح.", "success");

  } catch (error) {
    showInvoiceMessage(
      "حدث خطأ أثناء إنشاء الصورة: " + error.message,
      "error"
    );

  } finally {
    invoiceElements.pngBtn.disabled = false;
    invoiceElements.pngBtn.textContent = "تصدير PNG";
  }
}


/**
 * Print invoice.
 */
function printInvoice() {
  if (!invoiceState.filteredRecords.length) return;

  window.print();
}


/**
 * Check if time value exists.
 */
function hasTimeValue(value) {
  return value !== null &&
    value !== undefined &&
    String(value).trim() !== "";
}


/**
 * Format time safely.
 */
function formatInvoiceTime(value) {
  if (!hasTimeValue(value)) return "—";

  if (value instanceof Date) {
    return value.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  const text = String(value).trim();

  const isoMatch = text.match(/T(\d{2}:\d{2})/);

  if (isoMatch) {
    return isoMatch[1];
  }

  const timeMatch = text.match(/(\d{1,2}:\d{2})/);

  if (timeMatch) {
    return timeMatch[1];
  }

  return text;
}


/**
 * Get Arabic weekday from yyyy-MM-dd.
 */
function getArabicDayName(dateString) {
  const parts = String(dateString).split("-").map(Number);

  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return "—";
  }

  const date = new Date(
    Date.UTC(parts[0], parts[1] - 1, parts[2])
  );

  return date.toLocaleDateString("ar-EG", {
    weekday: "long",
    timeZone: "UTC"
  });
}


/**
 * Translate shift status.
 */
function getShiftStatusLabel(status) {
  const value = String(status || "").trim().toUpperCase();

  const labels = {
    COMPLETED: "مكتمل",
    COMPLETE: "مكتمل",
    PRESENT: "حضور",
    ABSENT: "غياب",
    LATE: "متأخر",
    PENDING: "قيد المراجعة",
    REVIEWED: "تمت المراجعة",
    APPROVED: "معتمد",
    REJECTED: "مرفوض"
  };

  return labels[value] || status || "—";
}


/**
 * Format money.
 */
function formatInvoiceMoney(value) {
  return `${formatInvoiceNumber(value)} جنيه`;
}


/**
 * Format numbers.
 */
function formatInvoiceNumber(value) {
  return (Number(value) || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}


/**
 * Round monetary values.
 */
function roundInvoiceMoney(value) {
  return Math.round(
    (Number(value) + Number.EPSILON) * 100
  ) / 100;
}


/**
 * Get local date.
 */
function getLocalDateString() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


/**
 * Escape HTML.
 */
function escapeInvoiceHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });
}


/**
 * Show message.
 */
function showInvoiceMessage(message, type = "info") {
  invoiceElements.message.textContent = message;
  invoiceElements.message.className = `message ${type}`;
  invoiceElements.message.style.display = "block";
}


/**
 * Hide message.
 */
function hideInvoiceMessage() {
  invoiceElements.message.textContent = "";
  invoiceElements.message.className = "message";
  invoiceElements.message.style.display = "none";
}


/**
 * Enable export buttons.
 */
function enableExportButtons() {
  invoiceElements.excelBtn.disabled = false;
  invoiceElements.pngBtn.disabled = false;
  invoiceElements.printBtn.disabled = false;
}


/**
 * Disable export buttons.
 */
function disableExportButtons() {
  invoiceElements.excelBtn.disabled = true;
  invoiceElements.pngBtn.disabled = true;
  invoiceElements.printBtn.disabled = true;
}


/**
 * Generate button loading state.
 */
function setInvoiceLoading(loading) {
  invoiceElements.generateBtn.disabled = loading;

  invoiceElements.generateBtn.textContent = loading
    ? "جاري التحميل..."
    : "إنشاء الفاتورة";
}
