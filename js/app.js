
const employeeForm = document.getElementById("employeeForm");
const saveEmployeeButton = document.getElementById("saveEmployeeButton");
const messageElement = document.getElementById("message");

const loadEmployeesButton = document.getElementById("loadEmployees");
const resultElement = document.getElementById("result");

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
  resultElement.textContent = "Loading...";

  try {
    const employees = await getEmployees();

    resultElement.textContent = JSON.stringify(
      {
        success: true,
        data: employees
      },
      null,
      2
    );

  } catch (error) {
    resultElement.textContent = "Error: " + error.message;
  }
}

loadEmployeesButton.addEventListener("click", loadEmployees);
