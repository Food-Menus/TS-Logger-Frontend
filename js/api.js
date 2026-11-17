
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


async function updateEmployee(employeeID, employeeData) {
  const response = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "updateEmployee",
      employeeID: employeeID,
      data: employeeData
    })
  });

  if (!response.ok) {
    throw new Error("Failed to connect to the server.");
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || "Failed to update employee.");
  }

  return result;
}


async function deleteEmployee(employeeID) {
  const response = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "deleteEmployee",
      employeeID: employeeID
    })
  });

  if (!response.ok) {
    throw new Error("Failed to connect to the server.");
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || "Failed to delete employee.");
  }

  return result;
}


async function uploadEmployeeIDImage(employeeID, imageType, imageData) {
  const response = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "uploadEmployeeIDImage",
      employeeID: employeeID,
      imageType: imageType,
      imageData: imageData
    })
  });

  if (!response.ok) {
    throw new Error("Failed to connect to the server.");
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || "Failed to upload image.");
  }

  return result;
}






async function importRawAttendance(records) {
  const response = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "importRawAttendance",
      records: records
    })
  });

  if (!response.ok) {
    throw new Error("Failed to connect to the server.");
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(
      result.message || "Failed to import attendance records."
    );
  }

  return result;
}

