const employeeForm = document.getElementById("employeeForm");
const saveEmployeeButton = document.getElementById("saveEmployeeButton");
const messageElement = document.getElementById("message");

const loadEmployeesButton = document.getElementById("loadEmployees");
const employeeListElement = document.getElementById("employeeList");
const employeeSearchInput = document.getElementById("employeeSearch");

const imageModal = document.getElementById("imageModal");
const modalImage = document.getElementById("modalImage");
const imageModalTitle = document.getElementById("imageModalTitle");
const closeImageModalButton = document.getElementById("closeImageModal");

let employeesCache = [];


// Add employee
employeeForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const employeeData = {
    employeeID: document.getElementById("employeeID").value,
    employeeName: document.getElementById("employeeName").value.trim(),
    hourlyRate: document.getElementById("hourlyRate").value
  };

  saveEmployeeButton.disabled = true;
  messageElement.textContent = "جاري حفظ الموظف...";
  messageElement.style.color = "#164e63";

  try {
    const result = await addEmployee(employeeData);

    messageElement.textContent = result.message;
    messageElement.style.color = "green";

    employeeForm.reset();

    await loadEmployees();

  } catch (error) {
    messageElement.textContent = error.message;
    messageElement.style.color = "red";

  } finally {
    saveEmployeeButton.disabled = false;
  }
});


// Load employees
async function loadEmployees() {
  employeeListElement.textContent = "جاري تحميل الموظفين...";

  try {
    employeesCache = await getEmployees();
    populateAttendanceEmployeeFilter();
    renderEmployees(employeesCache);

  } catch (error) {
    employeeListElement.textContent = "Error: " + error.message;
  }
}


// Render employees
function renderEmployees(employees) {
  employeeListElement.replaceChildren();

  const searchValue = employeeSearchInput.value
    .trim()
    .toLowerCase();

  const filteredEmployees = employees.filter(employee =>
    String(employee.employeeID).includes(searchValue) ||
    String(employee.employeeName).toLowerCase().includes(searchValue)
  );

  if (filteredEmployees.length === 0) {
    employeeListElement.textContent =
      employees.length === 0
        ? "لا يوجد موظفون مسجلون."
        : "لم يتم العثور على موظف مطابق للبحث.";

    return;
  }

  const table = document.createElement("table");

  const headers = [
    "الرقم الوظيفي",
    "اسم الموظف",
    "سعر الساعة",
    "صور البطاقة",
    "الإجراءات"
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

  filteredEmployees.forEach(employee => {
    const row = document.createElement("tr");

    const idCell = document.createElement("td");
    idCell.textContent = employee.employeeID;

    const nameCell = document.createElement("td");
    nameCell.textContent = employee.employeeName;

    const rateCell = document.createElement("td");
    rateCell.textContent = employee.hourlyRate;

    // ID image controls
    const imagesCell = document.createElement("td");

    // Front ID
    const frontLabel = document.createElement("label");
    frontLabel.className = "image-label";
    frontLabel.textContent = "الوجه الأمامي";

    const frontImageInput = document.createElement("input");
    frontImageInput.type = "file";
    frontImageInput.accept = "image/jpeg,image/png,image/webp";
    frontImageInput.className = "image-input";

    frontImageInput.addEventListener("change", () => {
      handleImageUpload(
        employee.employeeID,
        "front",
        frontImageInput.files[0]
      );
    });

    imagesCell.append(frontLabel, frontImageInput);

    if (employee.idFrontURL) {
      const viewFrontButton = document.createElement("button");
      viewFrontButton.type = "button";
      viewFrontButton.textContent = "عرض الأمامي";
      viewFrontButton.className = "view-image-button";

      viewFrontButton.addEventListener("click", () => {
        openImageModal(
          employee.idFrontURL,
          `صورة الوجه الأمامي - ${employee.employeeName}`
        );
      });

      imagesCell.appendChild(viewFrontButton);
    }

    // Back ID
    const backLabel = document.createElement("label");
    backLabel.className = "image-label";
    backLabel.textContent = "الوجه الخلفي";

    const backImageInput = document.createElement("input");
    backImageInput.type = "file";
    backImageInput.accept = "image/jpeg,image/png,image/webp";
    backImageInput.className = "image-input";

    backImageInput.addEventListener("change", () => {
      handleImageUpload(
        employee.employeeID,
        "back",
        backImageInput.files[0]
      );
    });

    imagesCell.append(backLabel, backImageInput);

    if (employee.idBackURL) {
      const viewBackButton = document.createElement("button");
      viewBackButton.type = "button";
      viewBackButton.textContent = "عرض الخلفي";
      viewBackButton.className = "view-image-button";

      viewBackButton.addEventListener("click", () => {
        openImageModal(
          employee.idBackURL,
          `صورة الوجه الخلفي - ${employee.employeeName}`
        );
      });

      imagesCell.appendChild(viewBackButton);
    }

    // Action buttons
    const actionsCell = document.createElement("td");

    const editButton = document.createElement("button");
    editButton.textContent = "تعديل";
    editButton.className = "edit-button";
    editButton.dataset.action = "edit";
    editButton.dataset.id = employee.employeeID;

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "حذف";
    deleteButton.className = "delete-button";
    deleteButton.dataset.action = "delete";
    deleteButton.dataset.id = employee.employeeID;

    actionsCell.append(editButton, deleteButton);

    row.append(
      idCell,
      nameCell,
      rateCell,
      imagesCell,
      actionsCell
    );

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  employeeListElement.appendChild(table);
}


// Convert Google Drive file URL to an image URL
function getDriveImageURL(fileURL) {
  const match = fileURL.match(/\/d\/([a-zA-Z0-9_-]+)/);

  if (!match) {
    throw new Error("رابط صورة البطاقة غير صالح.");
  }

  const fileID = match[1];

  return `https://drive.google.com/thumbnail?id=${fileID}&sz=w1200`;
}


// Open image modal
function openImageModal(imageURL, title) {
  try {
    modalImage.src = getDriveImageURL(imageURL);
    imageModalTitle.textContent = title;

    imageModal.classList.add("active");
    imageModal.setAttribute("aria-hidden", "false");

  } catch (error) {
    messageElement.textContent = error.message;
    messageElement.style.color = "red";
  }
}


// Close image modal
function closeImageModal() {
  imageModal.classList.remove("active");
  imageModal.setAttribute("aria-hidden", "true");
  modalImage.src = "";
}

closeImageModalButton.addEventListener("click", closeImageModal);

imageModal.addEventListener("click", (event) => {
  if (event.target === imageModal) {
    closeImageModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeImageModal();
  }
});


// Search employees
employeeSearchInput.addEventListener("input", () => {
  renderEmployees(employeesCache);
});


// Handle edit and delete buttons
employeeListElement.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  const employeeID = Number(button.dataset.id);
  const action = button.dataset.action;

  if (action === "edit") {
    await handleEditEmployee(employeeID);
  }

  if (action === "delete") {
    await handleDeleteEmployee(employeeID);
  }
});


// Edit employee
async function handleEditEmployee(employeeID) {
  try {
    const employee = employeesCache.find(
      item => Number(item.employeeID) === employeeID
    );

    if (!employee) {
      throw new Error("Employee not found.");
    }

    const employeeName = prompt(
      "أدخل اسم الموظف الجديد:",
      employee.employeeName
    );

    if (employeeName === null) {
      return;
    }

    const hourlyRate = prompt(
      "أدخل سعر الساعة الجديد:",
      employee.hourlyRate
    );

    if (hourlyRate === null) {
      return;
    }

    const employeeData = {
      employeeName: employeeName.trim(),
      hourlyRate: hourlyRate
    };

    const result = await updateEmployee(
      employeeID,
      employeeData
    );

    messageElement.textContent = result.message;
    messageElement.style.color = "green";

    await loadEmployees();

  } catch (error) {
    messageElement.textContent = error.message;
    messageElement.style.color = "red";
  }
}


// Delete employee
async function handleDeleteEmployee(employeeID) {
  const confirmed = confirm(
    `هل أنت متأكد من حذف الموظف رقم ${employeeID}؟`
  );

  if (!confirmed) {
    return;
  }

  try {
    const result = await deleteEmployee(employeeID);

    messageElement.textContent = result.message;
    messageElement.style.color = "green";

    await loadEmployees();

  } catch (error) {
    messageElement.textContent = error.message;
    messageElement.style.color = "red";
  }
}


// Upload employee ID image
async function handleImageUpload(employeeID, imageType, file) {
  if (!file) {
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    messageElement.textContent = "حجم الصورة يجب ألا يتجاوز 5 MB.";
    messageElement.style.color = "red";
    return;
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (!allowedTypes.includes(file.type)) {
    messageElement.textContent =
      "نوع الصورة غير مدعوم. استخدم JPG أو PNG أو WEBP.";

    messageElement.style.color = "red";
    return;
  }

  try {
    messageElement.textContent = "جاري رفع الصورة...";
    messageElement.style.color = "#164e63";

    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        resolve(reader.result.split(",")[1]);
      };

      reader.onerror = () => {
        reject(new Error("Failed to read image."));
      };

      reader.readAsDataURL(file);
    });

    const imageData = {
      fileName: file.name,
      mimeType: file.type,
      base64: base64
    };

    const result = await uploadEmployeeIDImage(
      employeeID,
      imageType,
      imageData
    );

    messageElement.textContent = result.message;
    messageElement.style.color = "green";

    await loadEmployees();

  } catch (error) {
    messageElement.textContent = error.message;
    messageElement.style.color = "red";
  }
}








// Attendance CSV Import
const attendanceFileInput = document.getElementById("attendanceFile");
const attendanceImportArea = document.getElementById("attendanceImportArea");
const attendanceStartDate = document.getElementById("attendanceStartDate");
const attendanceEndDate = document.getElementById("attendanceEndDate");
const attendanceEmployeeFilter = document.getElementById("attendanceEmployeeFilter");
const filterAttendanceButton = document.getElementById("filterAttendanceButton");
const attendanceImportSummary = document.getElementById("attendanceImportSummary");
const attendancePreview = document.getElementById("attendancePreview");

let attendanceRecords = [];


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


// Populate employee filter
function populateAttendanceEmployeeFilter() {
  attendanceEmployeeFilter.replaceChildren();

  employeesCache.forEach(employee => {
    const option = document.createElement("option");

    option.value = String(employee.employeeID);
    option.textContent =
      `${employee.employeeID} - ${employee.employeeName}`;

    attendanceEmployeeFilter.appendChild(option);
  });
}


// Read attendance CSV
attendanceFileInput.addEventListener("change", async () => {
  const file = attendanceFileInput.files[0];

  if (!file) {
    return;
  }

  try {
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
      const employeeID = row[columnIndexes["رقم الموظف"]].trim();

      const employee = employeesCache.find(
        item => String(item.employeeID).trim() === employeeID
      );

      return {
        employeeID,
        employeeName: employee
          ? employee.employeeName
          : "غير مسجل",

        attendanceDate: row[columnIndexes["التاريخ"]].trim(),
        attendanceTime: row[columnIndexes["توقيت البصمة"]].trim(),
        originalAction: row[columnIndexes["نوع الحركة"]].trim(),
        deviceIP: row[columnIndexes["IP الجهاز"]].trim()
      };
    });

    attendanceImportArea.hidden = false;

    populateAttendanceEmployeeFilter();

    const dates = attendanceRecords
      .map(record => record.attendanceDate)
      .sort();

    attendanceStartDate.value = dates[0];
    attendanceEndDate.value = dates[dates.length - 1];

    renderAttendancePreview(attendanceRecords);

    messageElement.textContent = "تمت قراءة ملف البصمات بنجاح.";
    messageElement.style.color = "green";

  } catch (error) {
    attendanceRecords = [];
    attendanceImportArea.hidden = true;

    messageElement.textContent = error.message;
    messageElement.style.color = "red";
  }
});


// Filter attendance records
filterAttendanceButton.addEventListener("click", () => {
  const startDate = attendanceStartDate.value;
  const endDate = attendanceEndDate.value;

  if (startDate && endDate && startDate > endDate) {
    messageElement.textContent = "تاريخ البداية يجب ألا يكون بعد تاريخ النهاية.";
    messageElement.style.color = "red";
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

    return matchesStartDate &&
      matchesEndDate &&
      matchesEmployee;
  });

  renderAttendancePreview(filteredRecords);
});


// Render attendance preview
function renderAttendancePreview(records) {
  attendancePreview.replaceChildren();

  attendanceImportSummary.textContent =
    `عدد السجلات المعروضة: ${records.length} من إجمالي ${attendanceRecords.length}`;

  if (records.length === 0) {
    attendancePreview.textContent = "لا توجد سجلات مطابقة للتصفية.";
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










// Refresh employees
loadEmployeesButton.addEventListener("click", loadEmployees);


// Initial load
loadEmployees();
