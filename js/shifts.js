

const shiftEmployeeSelect = document.getElementById("shiftEmployeeSelect");
const loadShiftAttendanceButton = document.getElementById("loadShiftAttendanceButton");
const shiftCheckInSelect = document.getElementById("shiftCheckInSelect");
const shiftCheckOutSelect = document.getElementById("shiftCheckOutSelect");
const plannedCheckInInput = document.getElementById("plannedCheckIn");
const shiftHoursInput = document.getElementById("shiftHours");
const createShiftButton = document.getElementById("createShiftButton");
const shiftMessage = document.getElementById("shiftMessage");

let shiftEmployees = [];
let availableShiftAttendance = [];

// ==========================================
// General Helpers
// ==========================================

function getObjectValue(object, possibleKeys) {
    for (const key of possibleKeys) {
        if (object && object[key] !== undefined && object[key] !== null) {
            return object[key];
        }
    }

    return "";
}

function getEmployeeID(employee) {
    return String(
        getObjectValue(employee, ["employeeID", "EmployeeID", "id", "ID"])
    );
}

function getEmployeeName(employee) {
    return getObjectValue(employee, [
        "employeeName",
        "EmployeeName",
        "name",
        "Name"
    ]);
}

function getEmployeeHourlyRate(employee) {
    return Number(
        getObjectValue(employee, [
            "hourlyRate",
            "HourlyRate",
            "hourly_rate"
        ])
    ) || 0;
}

function formatMoney(amount) {
    return `${Number(amount || 0).toFixed(2)} جنيه`;
}

function formatDuration(minutes) {
    const safeMinutes = Math.max(0, Math.round(minutes || 0));
    const hours = Math.floor(safeMinutes / 60);
    const remainingMinutes = safeMinutes % 60;

    return `${hours} ساعة و ${remainingMinutes} دقيقة`;
}

function roundMoney(amount) {
    return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function showShiftMessage(message, type = "info") {
    shiftMessage.textContent = message;
    shiftMessage.className = `shift-message ${type}`;
}

function hideShiftMessage() {
    shiftMessage.textContent = "";
    shiftMessage.className = "shift-message";
}

function resetShiftPreview() {
    document.getElementById("previewHourlyRate").textContent = "-";
    document.getElementById("previewShiftValue").textContent = "-";
    document.getElementById("previewActualDuration").textContent = "-";
    document.getElementById("previewLateMinutes").textContent = "-";
    document.getElementById("previewEarlyMinutes").textContent = "-";
    document.getElementById("previewTotalAmount").textContent = "-";
}

function resetPunchSelects() {
    shiftCheckInSelect.innerHTML =
        '<option value="">اختر بصمة الحضور</option>';

    shiftCheckOutSelect.innerHTML =
        '<option value="">اختر بصمة الانصراف</option>';

    shiftCheckInSelect.disabled = true;
    shiftCheckOutSelect.disabled = true;
    createShiftButton.disabled = true;

    resetShiftPreview();
}

// ==========================================
// Employees
// ==========================================

async function loadShiftEmployees() {
    try {
        shiftEmployeeSelect.innerHTML =
            '<option value="">جاري تحميل الموظفين...</option>';

        const result = await getEmployees();

        let employees = [];

        if (Array.isArray(result)) {
            employees = result;
        } else if (result && Array.isArray(result.data)) {
            employees = result.data;
        } else if (result && Array.isArray(result.employees)) {
            employees = result.employees;
        } else if (result && result.data && Array.isArray(result.data.employees)) {
            employees = result.data.employees;
        }

        shiftEmployees = employees;

        populateShiftEmployeeSelect();

    } catch (error) {
        console.error("Load employees error:", error);

        shiftEmployeeSelect.innerHTML =
            '<option value="">فشل تحميل الموظفين</option>';

        showShiftMessage(
            error.message || "حدث خطأ أثناء تحميل الموظفين.",
            "error"
        );
    }
}

function populateShiftEmployeeSelect() {
    shiftEmployeeSelect.innerHTML =
        '<option value="">اختر الموظف</option>';

    shiftEmployees.forEach(employee => {
        const employeeID = getEmployeeID(employee);
        const employeeName = getEmployeeName(employee);

        if (!employeeID) return;

        const option = document.createElement("option");

        option.value = employeeID;
        option.textContent = `${employeeName} (${employeeID})`;

        shiftEmployeeSelect.appendChild(option);
    });
}

function getSelectedEmployee() {
    const employeeID = shiftEmployeeSelect.value;

    return shiftEmployees.find(employee => {
        return getEmployeeID(employee) === employeeID;
    });
}

// ==========================================
// Attendance Helpers
// ==========================================

function getPunchID(record) {
    return String(
        getObjectValue(record, ["punchID", "PunchID"])
    );
}

function getPunchType(record) {
    return String(
        getObjectValue(record, ["attendanceType", "AttendanceType"])
    ).toUpperCase();
}

function getPunchDate(record) {
    return String(
        getObjectValue(record, ["attendanceDate", "AttendanceDate"])
    ).substring(0, 10);
}

function getPunchTime(record) {
    return String(
        getObjectValue(record, ["attendanceTime", "AttendanceTime"])
    ).substring(0, 8);
}

function getPunchDateTime(record) {
    const date = getPunchDate(record);
    const time = getPunchTime(record);

    if (!date || !time) return null;

    const dateParts = date.split("-").map(Number);
    const timeParts = time.split(":").map(Number);

    if (dateParts.length !== 3 || timeParts.length < 2) {
        return null;
    }

    const [year, month, day] = dateParts;
    const [hour, minute, second = 0] = timeParts;

    if (![year, month, day, hour, minute, second].every(Number.isFinite)) {
        return null;
    }

    return new Date(year, month - 1, day, hour, minute, second);
}

function getPunchLabel(record) {
    const date = getPunchDate(record);
    const time = getPunchTime(record);
    const employeeName = getObjectValue(record, [
        "employeeName",
        "EmployeeName"
    ]);

    return `${date} - ${time} - ${employeeName}`;
}

function createShiftAttendanceOption(record) {
    const option = document.createElement("option");

    option.value = getPunchID(record);
    option.textContent = getPunchLabel(record);

    return option;
}

// ==========================================
// Load Available Attendance
// ==========================================

async function loadAvailableShiftAttendance() {
    const employeeID = shiftEmployeeSelect.value;

    if (!employeeID) {
        showShiftMessage("من فضلك اختر الموظف أولًا.", "error");
        return;
    }

    try {
        hideShiftMessage();
        resetPunchSelects();

        loadShiftAttendanceButton.disabled = true;
        loadShiftAttendanceButton.textContent = "جاري التحميل...";

        const result = await getAvailableAttendanceForShift(employeeID);

        if (!result || result.success !== true) {
            throw new Error(
                result?.message || "فشل تحميل البصمات المتاحة."
            );
        }

        availableShiftAttendance = Array.isArray(result.records)
            ? result.records
            : [];

        renderAvailableShiftAttendance();

        if (availableShiftAttendance.length === 0) {
            showShiftMessage(
                "لا توجد بصمات معتمدة ومتاحة لهذا الموظف.",
                "info"
            );
        } else {
            showShiftMessage(
                `تم تحميل ${availableShiftAttendance.length} بصمة متاحة.`,
                "success"
            );
        }

    } catch (error) {
        console.error("Load attendance error:", error);

        availableShiftAttendance = [];
        resetPunchSelects();

        showShiftMessage(
            error.message || "حدث خطأ أثناء تحميل البصمات.",
            "error"
        );

    } finally {
        loadShiftAttendanceButton.disabled = false;
        loadShiftAttendanceButton.textContent = "تحميل البصمات المتاحة";
    }
}

function renderAvailableShiftAttendance() {
    resetPunchSelects();

    const checkInRecords = availableShiftAttendance.filter(record => {
        return getPunchType(record) === "IN";
    });

    const checkOutRecords = availableShiftAttendance.filter(record => {
        return getPunchType(record) === "OUT";
    });

    checkInRecords.forEach(record => {
        shiftCheckInSelect.appendChild(
            createShiftAttendanceOption(record)
        );
    });

    checkOutRecords.forEach(record => {
        shiftCheckOutSelect.appendChild(
            createShiftAttendanceOption(record)
        );
    });

    shiftCheckInSelect.disabled = checkInRecords.length === 0;
    shiftCheckOutSelect.disabled = checkOutRecords.length === 0;

    updateCreateButtonState();
}

// ==========================================
// Shift Preview
// ==========================================

function getSelectedPunch(selectElement) {
    const punchID = selectElement.value;

    if (!punchID) return null;

    return availableShiftAttendance.find(record => {
        return getPunchID(record) === punchID;
    }) || null;
}

function getMinutesDifference(startDate, endDate) {
    return Math.round((endDate.getTime() - startDate.getTime()) / 60000);
}

function calculateShiftPreview() {
    const employee = getSelectedEmployee();
    const checkInRecord = getSelectedPunch(shiftCheckInSelect);
    const checkOutRecord = getSelectedPunch(shiftCheckOutSelect);

    if (!employee || !checkInRecord || !checkOutRecord) {
        resetShiftPreview();
        return;
    }

    const hourlyRate = getEmployeeHourlyRate(employee);
    const shiftHours = Number(shiftHoursInput.value);
    const plannedTime = plannedCheckInInput.value;

    if (
        !Number.isFinite(hourlyRate) ||
        hourlyRate < 0 ||
        !Number.isFinite(shiftHours) ||
        shiftHours <= 0 ||
        shiftHours > 24 ||
        !plannedTime
    ) {
        resetShiftPreview();
        return;
    }

    const actualCheckIn = getPunchDateTime(checkInRecord);
    const actualCheckOut = getPunchDateTime(checkOutRecord);

    if (!actualCheckIn || !actualCheckOut) {
        resetShiftPreview();
        return;
    }

    const plannedParts = plannedTime.split(":").map(Number);

    if (plannedParts.length < 2 || !plannedParts.every(Number.isFinite)) {
        resetShiftPreview();
        return;
    }

    const plannedCheckIn = new Date(actualCheckIn);

    plannedCheckIn.setHours(
        plannedParts[0],
        plannedParts[1],
        0,
        0
    );

    // Handle shifts whose planned start is on the previous day.
    if (
        plannedCheckIn.getTime() - actualCheckIn.getTime() >
        12 * 60 * 60 * 1000
    ) {
        plannedCheckIn.setDate(plannedCheckIn.getDate() - 1);
    }

    // Handle shifts whose planned start is on the next day.
    if (
        actualCheckIn.getTime() - plannedCheckIn.getTime() >
        12 * 60 * 60 * 1000
    ) {
        plannedCheckIn.setDate(plannedCheckIn.getDate() + 1);
    }

    let actualOut = new Date(actualCheckOut);

    if (actualOut.getTime() <= actualCheckIn.getTime()) {
        actualOut.setDate(actualOut.getDate() + 1);
    }

    const plannedCheckOut = new Date(
        plannedCheckIn.getTime() + shiftHours * 60 * 60 * 1000
    );

    const actualDuration = getMinutesDifference(
        actualCheckIn,
        actualOut
    );

    const lateMinutes = Math.max(
        0,
        getMinutesDifference(plannedCheckIn, actualCheckIn)
    );

    const earlyLeaveMinutes = Math.max(
        0,
        getMinutesDifference(actualOut, plannedCheckOut)
    );

    const shiftValue = roundMoney(shiftHours * hourlyRate);

    const lateDeduction = roundMoney(
        lateMinutes * (hourlyRate / 60) * 2
    );

    const earlyLeaveDeduction = roundMoney(
        earlyLeaveMinutes * (hourlyRate / 60) * 2
    );

    const totalAmount = roundMoney(
        shiftValue - lateDeduction - earlyLeaveDeduction
    );

    document.getElementById("previewHourlyRate").textContent =
        formatMoney(hourlyRate);

    document.getElementById("previewShiftValue").textContent =
        formatMoney(shiftValue);

    document.getElementById("previewActualDuration").textContent =
        formatDuration(actualDuration);

    document.getElementById("previewLateMinutes").textContent =
        formatDuration(lateMinutes);

    document.getElementById("previewEarlyMinutes").textContent =
        formatDuration(earlyLeaveMinutes);

    document.getElementById("previewTotalAmount").textContent =
        formatMoney(totalAmount);
}

// ==========================================
// Select Events
// ==========================================

function updateCreateButtonState() {
    createShiftButton.disabled = !(
        shiftCheckInSelect.value &&
        shiftCheckOutSelect.value
    );

    calculateShiftPreview();
}

function handleCheckInChange() {
    const record = getSelectedPunch(shiftCheckInSelect);

    if (record && record.suggestedPlannedCheckIn) {
        plannedCheckInInput.value = record.suggestedPlannedCheckIn;
    }

    updateCreateButtonState();
}

// ==========================================
// Create Shift
// ==========================================

async function submitCreateShift() {
    const checkInPunchID = shiftCheckInSelect.value;
    const checkOutPunchID = shiftCheckOutSelect.value;
    const plannedCheckIn = plannedCheckInInput.value;
    const shiftHours = Number(shiftHoursInput.value);

    if (!shiftEmployeeSelect.value) {
        showShiftMessage("من فضلك اختر الموظف.", "error");
        return;
    }

    if (!checkInPunchID || !checkOutPunchID) {
        showShiftMessage(
            "من فضلك اختر بصمة الحضور وبصمة الانصراف.",
            "error"
        );
        return;
    }

    if (checkInPunchID === checkOutPunchID) {
        showShiftMessage(
            "لا يمكن استخدام نفس البصمة للحضور والانصراف.",
            "error"
        );
        return;
    }

    if (!plannedCheckIn) {
        showShiftMessage(
            "من فضلك حدد وقت بداية الوردية.",
            "error"
        );
        return;
    }

    if (
        !Number.isFinite(shiftHours) ||
        shiftHours <= 0 ||
        shiftHours > 24
    ) {
        showShiftMessage(
            "عدد ساعات الوردية يجب أن يكون أكبر من صفر وأقل من أو يساوي 24.",
            "error"
        );
        return;
    }

    const checkInRecord = getSelectedPunch(shiftCheckInSelect);
    const checkOutRecord = getSelectedPunch(shiftCheckOutSelect);

    if (!checkInRecord || !checkOutRecord) {
        showShiftMessage(
            "تعذر العثور على بيانات البصمات المختارة. أعد تحميل البصمات.",
            "error"
        );
        return;
    }

    if (
        getPunchType(checkInRecord) !== "IN" ||
        getPunchType(checkOutRecord) !== "OUT"
    ) {
        showShiftMessage(
            "يجب اختيار بصمة IN للحضور وبصمة OUT للانصراف.",
            "error"
        );
        return;
    }

    const confirmed = confirm(
        "هل أنت متأكد من إنشاء الوردية باستخدام البصمتين المحددتين؟"
    );

    if (!confirmed) return;

    try {
        hideShiftMessage();

        createShiftButton.disabled = true;
        createShiftButton.textContent = "جاري إنشاء الوردية...";

        // Send only the fields required by the backend.
        const shiftData = {
            checkInPunchID,
            checkOutPunchID,
            plannedCheckIn,
            shiftHours
        };

        const result = await createShift(shiftData);

        if (!result || result.success !== true) {
            throw new Error(
                result?.message || "فشل إنشاء الوردية."
            );
        }

        const createdShift = result.data || {};
        const shiftID = createdShift.ShiftID || createdShift.shiftID || "";

        showShiftMessage(
            shiftID
                ? `تم إنشاء الوردية بنجاح. رقم الوردية: ${shiftID}`
                : "تم إنشاء الوردية بنجاح.",
            "success"
        );

        resetPunchSelects();

        await loadAvailableShiftAttendance();

    } catch (error) {
        console.error("Create shift error:", error);

        showShiftMessage(
            error.message || "حدث خطأ أثناء إنشاء الوردية.",
            "error"
        );

    } finally {
        createShiftButton.textContent = "إنشاء الوردية";
        updateCreateButtonState();
    }
}

// ==========================================
// Event Listeners
// ==========================================

shiftEmployeeSelect.addEventListener("change", () => {
    availableShiftAttendance = [];
    resetPunchSelects();
    hideShiftMessage();
});

loadShiftAttendanceButton.addEventListener(
    "click",
    loadAvailableShiftAttendance
);

shiftCheckInSelect.addEventListener(
    "change",
    handleCheckInChange
);

shiftCheckOutSelect.addEventListener(
    "change",
    updateCreateButtonState
);

plannedCheckInInput.addEventListener(
    "input",
    calculateShiftPreview
);

shiftHoursInput.addEventListener(
    "input",
    calculateShiftPreview
);

createShiftButton.addEventListener(
    "click",
    submitCreateShift
);

// ==========================================
// Initialize
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    loadShiftEmployees();
});
