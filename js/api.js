
async function getEmployees() {
  const response = await fetch(
    `${API_URL}?action=getEmployees`
  );

  if (!response.ok) {
    throw new Error("Failed to connect to the server.");
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || "API request failed.");
  }

  return result.data;
}

async function addEmployee(employeeData) {
  const response = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "addEmployee",
      data: employeeData
    })
  });

  if (!response.ok) {
    throw new Error("Failed to connect to the server.");
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || "Failed to add employee.");
  }

  return result;
}
