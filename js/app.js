
const employeeForm = document.getElementById("employeeForm");
const saveEmployeeButton = document.getElementById("saveEmployeeButton");
const messageElement = document.getElementById("message");

const loadEmployeesButton = document.getElementById("loadEmployees");
const employeeListElement = document.getElementById("employeeList");
const employeeSearchInput = document.getElementById("employeeSearch");

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

    // ID image upload controls
    const imagesCell = document.createElement("td");

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

    imagesCell.append(
      frontLabel,
      frontImageInput,
      backLabel,
      backImageInput
    );

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


// Refresh employees
loadEmployeesButton.addEventListener("click", loadEmployees);


// Initial load
loadEmployees();
