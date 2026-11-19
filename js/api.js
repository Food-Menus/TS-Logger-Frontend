
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




async function getRawAttendance() {
  const response = await fetch(
    `${API_URL}?action=getRawAttendance`
  );

  if (!response.ok) {
    throw new Error("Failed to connect to the server.");
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(
      result.message || "Failed to load attendance records."
    );
  }
  
  return result;
}





async function getAttendanceReview() {
  const response = await fetch(
    `${API_URL}?action=getAttendanceReview`
  );

  if (!response.ok) {
    throw new Error("Failed to connect to the server.");
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(
      result.message || "Failed to load attendance review records."
    );
  }

  return result;
}


async function saveAttendanceReview(updates) {
  const response = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "saveAttendanceReview",
      updates: updates
    })
  });

  if (!response.ok) {
    throw new Error("Failed to connect to the server.");
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(
      result.message || "Failed to save attendance review."
    );
  }

  return result;
}



async function getAvailableAttendanceForShift(employeeID) {
  const response = await fetch(
    `${API_URL}?action=getAvailableAttendanceForShift&employeeID=${encodeURIComponent(employeeID)}`
  );

  if (!response.ok) {
    throw new Error("Failed to connect to the server.");
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(
      result.message || "Failed to load available attendance."
    );
  }

  return result;
}


async function createShift(shiftData) {
  const response = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "createShift",
      data: shiftData
    })
  });

  if (!response.ok) {
    throw new Error("Failed to connect to the server.");
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(
      result.message || "Failed to create shift."
    );
  }

  return result;
}
// ========================================
// Shift Management API
// ========================================

async function getAvailableAttendanceForShift(employeeID) {
  const response = await fetch(
    `${API_URL}?action=getAvailableAttendanceForShift&employeeID=${encodeURIComponent(employeeID)}`
  );

  if (!response.ok) {
    throw new Error("Failed to connect to the server.");
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(
      result.message || "Failed to load available attendance."
    );
  }

  return result;
}


async function createShift(shiftData) {
  const response = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "createShift",
      data: shiftData
    })
  });

  if (!response.ok) {
    throw new Error("Failed to connect to the server.");
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(
      result.message || "Failed to create shift."
    );
  }

  return result;
}











async function getShiftsByDate(date) {
  const response = await fetch(
    `${API_URL}?action=getShiftsByDate&date=${encodeURIComponent(date)}`
  );

  if (!response.ok) {
    throw new Error("Failed to connect to the server.");
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || "Failed to load shifts.");
  }

  return result;
}


async function createShiftAdjustment(data) {
  const response = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "createShiftAdjustment",
      data: data
    })
  });

  if (!response.ok) {
    throw new Error("Failed to connect to the server.");
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(
      result.message || "Failed to create financial transaction."
    );
  }

  return result;
}









async function getShiftsByDateRange(startDate, endDate, employeeID) {
  const params = new URLSearchParams({
    action: "getShiftsByDateRange",
    startDate: startDate,
    endDate: endDate
  });

  if (employeeID) {
    params.set("employeeID", employeeID);
  }

  const response = await fetch(`${API_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to connect to the server.");
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(
      result.message || "Failed to load invoice data."
    );
  }

  return result;
}
