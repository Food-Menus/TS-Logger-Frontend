const loadEmployeesButton = document.getElementById("loadEmployees");
const resultElement = document.getElementById("result");

loadEmployeesButton.addEventListener("click", async () => {
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
    console.error(error);
  }
});