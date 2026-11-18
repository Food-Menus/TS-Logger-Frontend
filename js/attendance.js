
const attendanceFileInput = document.getElementById("attendanceFile");
const attendanceImportArea = document.getElementById("attendanceImportArea");
const attendanceStartDate = document.getElementById("attendanceStartDate");
const attendanceEndDate = document.getElementById("attendanceEndDate");
const attendanceEmployeeFilter = document.getElementById("attendanceEmployeeFilter");
const filterAttendanceButton = document.getElementById("filterAttendanceButton");
const saveAttendanceImportButton = document.getElementById("saveAttendanceImportButton");
const attendanceImportSummary = document.getElementById("attendanceImportSummary");
const attendancePreview = document.getElementById("attendancePreview");
const attendanceMessage = document.getElementById("attendanceMessage");

let employeesCache = [];
let attendanceRecords = [];
let currentImportSaved = false;


// Display attendance messages
function showAttendanceMessage(message, color = "green") {
  if (!attendanceMessage) {
    console.log(message);
    return;
  }

  attendanceMessage.textContent = message;
  attendanceMessage.style.color = color;
}


// Load employees for attendance matching
async function loadAttendanceEmployees() {
  try {
    showAttendanceMessage("جاري تحميل بيانات الموظفين...", "#00f2fe");

    employeesCache = await getEmployees();

    populateAttendanceEmployeeFilter();

    showAttendanceMessage("تم تحميل بيانات الموظفين بنجاح.");

  } catch (error) {
    showAttendanceMessage(
      "تعذر تحميل بيانات الموظفين: " + error.message,
      "red"
    );

    throw error;
  }
}


// Populate employee filter
function populateAttendanceEmployeeFilter() {
  attendanceEmployeeFilter.replaceChildren();

  employeesCache.forEach(employee => {
    const option = document.createElement("option");

    option.value = String(employee.employeeID).trim();
    option.textContent =
      `${employee.employeeID} - ${employee.employeeName}`;

    attendanceEmployeeFilter.appendChild(option);
  });
}


// Parse CSV content
function parseCSV(content) {
  const rows = [];
  let row = [];
  let value = "";
  let insideQuotes = false;

  content = content.replace(/^\uFEFF/, "");

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      value += '"';
      i++;

    } else if (char === '"') {
      insideQuotes = !insideQuotes;

    } else if (char === "," && !insideQuotes) {
      row.push(value);
      value = "";

    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }

      row.push(value);

      if (row.some(cell => cell.trim() !== "")) {
        rows.push(row);
      }

      row = [];
      value = "";

    } else {
      value += char;
    }
  }

  row.push(value);

  if (row.some(cell => cell.trim() !== "")) {
    rows.push(row);
  }

  return rows;
}


// Read attendance CSV
attendanceFileInput.addEventListener("change", async () => {
  const file = attendanceFileInput.files[0];

  if (!file) {
    return;
  }

  currentImportSaved = false;
  saveAttendanceImportButton.disabled = false;
  saveAttendanceImportButton.textContent =
    "حفظ البصمات في قاعدة البيانات";

  attendanceRecords = [];

  try {
    if (employeesCache.length === 0) {
      await loadAttendanceEmployees();
    }

    const content = await file.text();
    const rows = parseCSV(content);

    if (rows.length < 2) {
      throw new Error("ملف CSV لا يحتوي على سجلات.");
    }

    const headers = rows[0].map(header => header.trim());

    const requiredHeaders = [
      "رقم الموظف",
      "اسم الموظف",
      "التاريخ",
      "توقيت البصمة",
      "نوع الحركة",
      "IP الجهاز"
    ];

    const columnIndexes = {};

    requiredHeaders.forEach(header => {
      const index = headers.indexOf(header);

      if (index === -1) {
        throw new Error(`العمود ${header} غير موجود في الملف.`);
      }

      columnIndexes[header] = index;
    });

    attendanceRecords = rows.slice(1).map(row => {
      const employeeID =
        row[columnIndexes["رقم الموظف"]] || "";

      const originalEmployeeName =
        row[columnIndexes["اسم الموظف"]] || "";

      const employee = employeesCache.find(
        item =>
          String(item.employeeID).trim() === employeeID.trim()
      );

      return {
        employeeID: employeeID,

        employeeName: employee
          ? employee.employeeName
          : "غير مسجل",

        originalEmployeeName: originalEmployeeName,

        attendanceDate:
          row[columnIndexes["التاريخ"]] || "",

        attendanceTime:
          row[columnIndexes["توقيت البصمة"]] || "",

        originalAction:
          row[columnIndexes["نوع الحركة"]] || "",

        deviceIP:
          row[columnIndexes["IP الجهاز"]] || ""
      };
    });

    attendanceImportArea.hidden = false;

    const dates = attendanceRecords
      .map(record => record.attendanceDate.trim())
      .filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date))
      .sort();

    if (dates.length > 0) {
      attendanceStartDate.value = dates[0];
      attendanceEndDate.value = dates[dates.length - 1];
    }

    renderAttendancePreview(attendanceRecords);

    showAttendanceMessage(
      `تمت قراءة ${attendanceRecords.length} سجل بنجاح. يمكنك مراجعتها ثم حفظها.`
    );

  } catch (error) {
    attendanceRecords = [];
    attendanceImportArea.hidden = true;

    showAttendanceMessage(error.message, "red");
  }
});


// Save original attendance records
saveAttendanceImportButton.addEventListener("click", async () => {
  if (attendanceRecords.length === 0) {
    showAttendanceMessage("لا توجد سجلات للحفظ.", "red");
    return;
  }

  if (currentImportSaved) {
    showAttendanceMessage(
      "تم حفظ هذه البيانات بالفعل.",
      "red"
    );
    return;
  }

  try {
    saveAttendanceImportButton.disabled = true;
    saveAttendanceImportButton.textContent = "جاري الحفظ...";

    showAttendanceMessage(
      "جاري حفظ البصمات الأصلية في قاعدة البيانات...",
      "#00f2fe"
    );

    const records = attendanceRecords.map(record => ({
      employeeID: record.employeeID,
      originalEmployeeName: record.originalEmployeeName,
      attendanceDate: record.attendanceDate,
      attendanceTime: record.attendanceTime,
      originalAction: record.originalAction,
      deviceIP: record.deviceIP
    }));

    const result = await importRawAttendance(records);

    currentImportSaved = true;

    if (result.duplicate) {
      saveAttendanceImportButton.textContent =
        "تم استيراد هذه البيانات مسبقًا";

      showAttendanceMessage(
        "هذه البيانات موجودة بالفعل في قاعدة البيانات. لم تتم إضافة سجلات مكررة.",
        "#f59e0b"
      );

      return;
    }

    saveAttendanceImportButton.textContent = "تم الحفظ بنجاح";

    showAttendanceMessage(
      `تم حفظ ${result.importedCount} سجل بنجاح في RawAttendance.`,
      "green"
    );

  } catch (error) {
    saveAttendanceImportButton.disabled = false;
    saveAttendanceImportButton.textContent =
      "إعادة محاولة الحفظ";

    showAttendanceMessage(
      "فشل حفظ البصمات: " + error.message,
      "red"
    );
  }
});


// Filter attendance records
filterAttendanceButton.addEventListener("click", () => {
  const startDate = attendanceStartDate.value;
  const endDate = attendanceEndDate.value;

  if (startDate && endDate && startDate > endDate) {
    showAttendanceMessage(
      "تاريخ البداية يجب ألا يكون بعد تاريخ النهاية.",
      "red"
    );
    return;
  }

  const selectedEmployees = Array.from(
    attendanceEmployeeFilter.selectedOptions
  ).map(option => option.value);

  const filteredRecords = attendanceRecords.filter(record => {
    const matchesStartDate =
      !startDate || record.attendanceDate >= startDate;

    const matchesEndDate =
      !endDate || record.attendanceDate <= endDate;

    const matchesEmployee =
      selectedEmployees.length === 0 ||
      selectedEmployees.includes(record.employeeID.trim());

    return (
      matchesStartDate &&
      matchesEndDate &&
      matchesEmployee
    );
  });

  renderAttendancePreview(filteredRecords);
});


// Render attendance preview
function renderAttendancePreview(records) {
  attendancePreview.replaceChildren();

  attendanceImportSummary.textContent =
    `عدد السجلات المعروضة: ${records.length} من إجمالي ${attendanceRecords.length}`;

  if (records.length === 0) {
    attendancePreview.textContent =
      "لا توجد سجلات مطابقة للتصفية.";
    return;
  }

  const table = document.createElement("table");

  const headers = [
    "رقم الموظف",
    "اسم الموظف المعتمد",
    "التاريخ",
    "الوقت",
    "نوع الحركة",
    "IP الجهاز"
  ];

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  headers.forEach(header => {
    const th = document.createElement("th");
    th.textContent = header;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  records.forEach(record => {
    const row = document.createElement("tr");

    const values = [
      record.employeeID,
      record.employeeName,
      record.attendanceDate,
      record.attendanceTime,
      record.originalAction,
      record.deviceIP
    ];

    values.forEach(value => {
      const td = document.createElement("td");
      td.textContent = value;
      row.appendChild(td);
    });

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  attendancePreview.appendChild(table);
}


// Initial load
loadAttendanceEmployees();


// ========================================
// Raw Attendance
// ========================================


// Raw attendance elements
const loadRawAttendanceButton = document.getElementById(
  "loadRawAttendanceButton"
);

const rawAttendanceMessage = document.getElementById(
  "rawAttendanceMessage"
);

const rawAttendanceArea = document.getElementById(
  "rawAttendanceArea"
);

const rawAttendanceSummary = document.getElementById(
  "rawAttendanceSummary"
);

const rawAttendancePreview = document.getElementById(
  "rawAttendancePreview"
);


// Load saved raw attendance
async function loadSavedRawAttendance() {
  try {
    loadRawAttendanceButton.disabled = true;
    loadRawAttendanceButton.textContent = "جاري تحميل البصمات...";

    rawAttendanceMessage.textContent =
      "جاري الاتصال بقاعدة البيانات...";

    rawAttendanceMessage.style.color = "#00f2fe";

    const result = await getRawAttendance();

    renderRawAttendance(result.records);

    rawAttendanceArea.hidden = false;

    rawAttendanceMessage.textContent =
      "تم تحميل البصمات بنجاح.";

    rawAttendanceMessage.style.color = "green";

  } catch (error) {
    rawAttendanceMessage.textContent =
      "تعذر تحميل البصمات: " + error.message;

    rawAttendanceMessage.style.color = "red";

  } finally {
    loadRawAttendanceButton.disabled = false;
    loadRawAttendanceButton.textContent =
      "تحميل البصمات المسجلة";
  }
}


// Render saved raw attendance
function renderRawAttendance(records) {
  rawAttendancePreview.replaceChildren();

  rawAttendanceSummary.textContent =
    `إجمالي البصمات المسجلة: ${records.length}`;

  if (records.length === 0) {
    rawAttendancePreview.textContent =
      "لا توجد بصمات مسجلة في قاعدة البيانات.";

    return;
  }

  const table = document.createElement("table");

  const headers = [
    "رقم الموظف",
    "الاسم الأصلي",
    "التاريخ",
    "الوقت",
    "نوع الحركة",
    "IP الجهاز",
    "تاريخ الاستيراد"
  ];

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  headers.forEach(header => {
    const th = document.createElement("th");
    th.textContent = header;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  records.forEach(record => {
    const row = document.createElement("tr");

    const values = [
      record.employeeID,
      record.originalEmployeeName,
      record.attendanceDate,
      record.attendanceTime,
      record.originalAction,
      record.deviceIP,
      record.importedAt
        ? new Date(record.importedAt).toLocaleString("en-GB")
        : ""
    ];

    values.forEach(value => {
      const td = document.createElement("td");
      td.textContent = value ?? "";
      row.appendChild(td);
    });

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  rawAttendancePreview.appendChild(table);
}


// Load button event
loadRawAttendanceButton.addEventListener(
  "click",
  loadSavedRawAttendance
);


// ========================================
// Attendance Review
// ========================================


const loadAttendanceReviewButton = document.getElementById(
  "loadAttendanceReviewButton"
);

const attendanceReviewMessage = document.getElementById(
  "attendanceReviewMessage"
);

const attendanceReviewArea = document.getElementById(
  "attendanceReviewArea"
);

const attendanceReviewSummary = document.getElementById(
  "attendanceReviewSummary"
);

const attendanceReviewPreview = document.getElementById(
  "attendanceReviewPreview"
);

const saveAttendanceReviewButton = document.getElementById(
  "saveAttendanceReviewButton"
);


// Review filter elements
const reviewEmployeeMode = document.getElementById(
  "reviewEmployeeMode"
);

const reviewEmployeeSelectGroup = document.getElementById(
  "reviewEmployeeSelectGroup"
);

const reviewEmployeeFilter = document.getElementById(
  "reviewEmployeeFilter"
);

const reviewStartDate = document.getElementById(
  "reviewStartDate"
);

const reviewEndDate = document.getElementById(
  "reviewEndDate"
);

const applyReviewFilterButton = document.getElementById(
  "applyReviewFilterButton"
);

const resetReviewFilterButton = document.getElementById(
  "resetReviewFilterButton"
);


let attendanceReviewRecords = [];


function showAttendanceReviewMessage(message, color = "green") {
  attendanceReviewMessage.textContent = message;
  attendanceReviewMessage.style.color = color;
}


// Show or hide employee search
function updateReviewEmployeeFilterVisibility() {
  const isSingleEmployee = reviewEmployeeMode.value === "single";

  reviewEmployeeSelectGroup.hidden = !isSingleEmployee;

  if (!isSingleEmployee) {
    reviewEmployeeFilter.value = "";
  }
}


// Employee mode change
reviewEmployeeMode.addEventListener(
  "change",
  updateReviewEmployeeFilterVisibility
);


// Filter review records and render the result
function renderFilteredAttendanceReview() {
  const mode = reviewEmployeeMode.value;
  const employeeSearch = reviewEmployeeFilter.value.trim().toLowerCase();

  const startDate = reviewStartDate.value;
  const endDate = reviewEndDate.value;

  if (startDate && endDate && startDate > endDate) {
    showAttendanceReviewMessage(
      "تاريخ البداية يجب ألا يكون بعد تاريخ النهاية.",
      "red"
    );
    return;
  }

  if (mode === "single" && !employeeSearch) {
    showAttendanceReviewMessage(
      "اكتب اسم الموظف أو رقمه أولاً.",
      "#d97706"
    );

    reviewEmployeeFilter.focus();
    return;
  }

  const filteredRecords = attendanceReviewRecords.filter(record => {
    const employeeID = String(record.employeeID || "")
      .trim()
      .toLowerCase();

    const employeeName = String(record.employeeName || "")
      .trim()
      .toLowerCase();

    const matchesEmployee =
      mode === "all" ||
      employeeID.includes(employeeSearch) ||
      employeeName.includes(employeeSearch);

    const attendanceDate = String(record.attendanceDate || "").trim();

    const matchesStartDate =
      !startDate || attendanceDate >= startDate;

    const matchesEndDate =
      !endDate || attendanceDate <= endDate;

    return (
      matchesEmployee &&
      matchesStartDate &&
      matchesEndDate
    );
  });

  renderAttendanceReview(filteredRecords);

  showAttendanceReviewMessage(
    `تم عرض ${filteredRecords.length} سجل من إجمالي ${attendanceReviewRecords.length}.`
  );
}


// Apply filters
applyReviewFilterButton.addEventListener(
  "click",
  renderFilteredAttendanceReview
);


// Reset filters
resetReviewFilterButton.addEventListener("click", () => {
  reviewEmployeeMode.value = "all";
  reviewEmployeeFilter.value = "";
  reviewStartDate.value = "";
  reviewEndDate.value = "";

  updateReviewEmployeeFilterVisibility();

  renderAttendanceReview(attendanceReviewRecords);

  showAttendanceReviewMessage("تم عرض جميع سجلات المراجعة.");
});


// Load review records
async function loadAttendanceReview() {
  try {
    loadAttendanceReviewButton.disabled = true;

    loadAttendanceReviewButton.textContent =
      "جاري تحميل سجلات المراجعة...";

    showAttendanceReviewMessage(
      "جاري تجهيز سجلات المراجعة...",
      "#0e7490"
    );

    const result = await getAttendanceReview();

    attendanceReviewRecords = result.records || [];

    attendanceReviewArea.hidden = false;

    updateReviewEmployeeFilterVisibility();

    renderFilteredAttendanceReview();

    showAttendanceReviewMessage(
      `تم تحميل ${attendanceReviewRecords.length} سجل مراجعة.`
    );

  } catch (error) {
    showAttendanceReviewMessage(
      "تعذر تحميل سجلات المراجعة: " + error.message,
      "red"
    );

  } finally {
    loadAttendanceReviewButton.disabled = false;

    loadAttendanceReviewButton.textContent =
      "تحميل سجلات المراجعة";
  }
}


// Render review table
function renderAttendanceReview(records) {
  attendanceReviewPreview.replaceChildren();

  const pendingCount = records.filter(
    record => record.reviewStatus === "PENDING"
  ).length;

  const reviewedCount = records.filter(
    record => record.reviewStatus === "REVIEWED"
  ).length;

  const approvedCount = records.filter(
    record => record.reviewStatus === "APPROVED"
  ).length;

  attendanceReviewSummary.textContent =
    `المعروض: ${records.length} من ${attendanceReviewRecords.length} | ` +
    `معلقة: ${pendingCount} | ` +
    `تمت مراجعتها: ${reviewedCount} | ` +
    `معتمدة: ${approvedCount}`;

  if (records.length === 0) {
    attendanceReviewPreview.textContent =
      "لا توجد سجلات مطابقة للفلاتر المحددة.";

    return;
  }

  const table = document.createElement("table");

  const headers = [
    "رقم الموظف",
    "اسم الموظف",
    "التاريخ",
    "الوقت",
    "اقتراح النظام",
    "التصنيف النهائي",
    "حالة المراجعة",
    "اعتماد"
  ];

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  headers.forEach(text => {
    const th = document.createElement("th");

    th.textContent = text;

    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  records.forEach(record => {
    const row = document.createElement("tr");

    row.dataset.punchId = record.punchID;

    const values = [
      record.employeeID,
      record.employeeName,
      record.attendanceDate,
      record.attendanceTime,
      getAttendanceTypeLabel(record.suggestedType),
      null,
      getReviewStatusLabel(record.reviewStatus),
      null
    ];

    values.forEach((value, index) => {
      const td = document.createElement("td");

      // Final classification
      if (index === 5) {
        const select = document.createElement("select");

        select.className = "review-attendance-type";

        const options = [
          {
            value: "",
            label: "اختر التصنيف"
          },
          {
            value: "IN",
            label: "IN - حضور"
          },
          {
            value: "OUT",
            label: "OUT - انصراف"
          },
          {
            value: "IGNORED",
            label: "IGNORED - تجاهل"
          }
        ];

        options.forEach(optionData => {
          const option = document.createElement("option");

          option.value = optionData.value;
          option.textContent = optionData.label;

          select.appendChild(option);
        });

        select.value = record.attendanceType || "";

        if (record.reviewStatus === "APPROVED") {
          select.disabled = true;
        }

        td.appendChild(select);

      // Approval checkbox
      } else if (index === 7) {
        const checkbox = document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.className = "review-approve-checkbox";

        checkbox.title =
          "اعتماد هذا التصنيف عند الحفظ";

        checkbox.disabled =
          record.reviewStatus === "APPROVED";

        td.appendChild(checkbox);

      } else {
        td.textContent = value ?? "";

        if (index === 6) {
          const statusClass =
            record.reviewStatus === "APPROVED"
              ? "review-status-approved"
              : record.reviewStatus === "REVIEWED"
                ? "review-status-reviewed"
                : "review-status-pending";

          td.className = statusClass;
        }
      }

      row.appendChild(td);
    });

    tbody.appendChild(row);
  });

  table.appendChild(tbody);

  attendanceReviewPreview.appendChild(table);
}


// Attendance type labels
function getAttendanceTypeLabel(type) {
  const labels = {
    IN: "IN - حضور",
    OUT: "OUT - انصراف",
    IGNORED: "IGNORED - تجاهل"
  };

  return labels[type] || "لا يوجد اقتراح";
}


// Review status labels
function getReviewStatusLabel(status) {
  const labels = {
    PENDING: "معلقة",
    REVIEWED: "تمت المراجعة",
    APPROVED: "معتمدة"
  };

  return labels[status] || status || "معلقة";
}


// Save review changes for visible records only
async function submitAttendanceReview() {
  const rows = Array.from(
    attendanceReviewPreview.querySelectorAll("tbody tr")
  );

  const updates = [];

  rows.forEach(row => {
    const select = row.querySelector(
      ".review-attendance-type"
    );

    const approveCheckbox = row.querySelector(
      ".review-approve-checkbox"
    );

    if (!select || select.disabled || !select.value) {
      return;
    }

    updates.push({
      punchID: row.dataset.punchId,

      attendanceType: select.value,

      reviewStatus: approveCheckbox.checked
        ? "APPROVED"
        : "REVIEWED"
    });
  });

  if (updates.length === 0) {
    showAttendanceReviewMessage(
      "اختر تصنيفًا نهائيًا لبصمة واحدة على الأقل قبل الحفظ.",
      "#d97706"
    );

    return;
  }

  try {
    saveAttendanceReviewButton.disabled = true;

    saveAttendanceReviewButton.textContent =
      "جاري حفظ المراجعة...";

    const result = await saveAttendanceReview(updates);

    showAttendanceReviewMessage(
      `تم حفظ ${result.updatedCount} سجل مراجعة بنجاح.`,
      "green"
    );

    // Reload records while keeping the current filters
    await loadAttendanceReview();

  } catch (error) {
    showAttendanceReviewMessage(
      "فشل حفظ المراجعة: " + error.message,
      "red"
    );

  } finally {
    saveAttendanceReviewButton.disabled = false;

    saveAttendanceReviewButton.textContent =
      "حفظ التصنيفات والمراجعة";
  }
}


// Event listeners
loadAttendanceReviewButton.addEventListener(
  "click",
  loadAttendanceReview
);

saveAttendanceReviewButton.addEventListener(
  "click",
  submitAttendanceReview
);
