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