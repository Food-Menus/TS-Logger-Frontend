
const attendanceFileInput = document.getElementById("attendanceFile");
const attendanceImportArea = document.getElementById("attendanceImportArea");
const attendanceStartDate = document.getElementById("attendanceStartDate");
const attendanceEndDate = document.getElementById("attendanceEndDate");
const attendanceEmployeeFilter = document.getElementById("attendanceEmployeeFilter");
const filterAttendanceButton = document.getElementById("filterAttendanceButton");
const attendanceImportSummary = document.getElementById("attendanceImportSummary");
const attendancePreview = document.getElementById("attendancePreview");
const attendanceMessage = document.getElementById("attendanceMessage");

let employeesCache = [];
let attendanceRecords = [];


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
        (row[columnIndexes["رقم الموظف"]] || "").trim();

      // Employee name from the CSV is intentionally ignored.
      const employee = employeesCache.find(
        item =>
          String(item.employeeID).trim() === employeeID
      );

      return {
        employeeID,

        employeeName: employee
          ? employee.employeeName
          : "غير مسجل",

        attendanceDate:
          (row[columnIndexes["التاريخ"]] || "").trim(),

        attendanceTime:
          (row[columnIndexes["توقيت البصمة"]] || "").trim(),

        originalAction:
          (row[columnIndexes["نوع الحركة"]] || "").trim(),

        deviceIP:
          (row[columnIndexes["IP الجهاز"]] || "").trim()
      };
    });

    attendanceImportArea.hidden = false;

    const dates = attendanceRecords
      .map(record => record.attendanceDate)
      .filter(Boolean)
      .sort();

    if (dates.length > 0) {
      attendanceStartDate.value = dates[0];
      attendanceEndDate.value = dates[dates.length - 1];
    }

    renderAttendancePreview(attendanceRecords);

    showAttendanceMessage("تمت قراءة ملف البصمات بنجاح.");

  } catch (error) {
    attendanceRecords = [];
    attendanceImportArea.hidden = true;

    showAttendanceMessage(error.message, "red");
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
      selectedEmployees.includes(record.employeeID);

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
