const employeeForm = document.getElementById("employeeForm");
const saveEmployeeButton = document.getElementById("saveEmployeeButton");
const messageElement = document.getElementById("message");

const loadEmployeesButton = document.getElementById("loadEmployees");
const employeeListElement = document.getElementById("employeeList");


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


async function loadEmployees() {
  employeeListElement.textContent = "جاري تحميل الموظفين...";

  try {
    const employees = await getEmployees();

    renderEmployees(employees);

  } catch (error) {
    employeeListElement.textContent = "Error: " + error.message;
  }
}


function renderEmployees(employees) {
  employeeListElement.replaceChildren();

  if (employees.length === 0) {
    employeeListElement.textContent = "لا يوجد موظفون مسجلون.";
    return;
  }

  const table = document.createElement("table");

  const headers = [
    "الرقم الوظيفي",
    "اسم الموظف",
    "سعر الساعة",
    "الإجراءات"
  ];

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  employees.forEach((employee) => {
    const row = document.createElement("tr");

    const idCell = document.createElement("td");
    idCell.textContent = employee.employeeID;

    const nameCell = document.createElement("td");
    nameCell.textContent = employee.employeeName;

    const rateCell = document.createElement("td");
    rateCell.textContent = employee.hourlyRate;

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

    row.append(idCell, nameCell, rateCell, actionsCell);
    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  employeeListElement.appendChild(table);
}


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


async function handleEditEmployee(employeeID) {
  try {
    const employees = await getEmployees();

    const employee = employees.find(
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

    const result = await updateEmployee(employeeID, employeeData);

    messageElement.textContent = result.message;
    messageElement.style.color = "green";

    await loadEmployees();

  } catch (error) {
    messageElement.textContent = error.message;
    messageElement.style.color = "red";
  }
}


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


loadEmployeesButton.addEventListener("click", loadEmployees);

loadEmployees();
