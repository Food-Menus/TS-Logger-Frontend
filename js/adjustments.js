
/**
 * FINANCIAL ADJUSTMENTS PAGE
 */

const adjustmentState = {
  shifts: [],
  selectedShift: null,
  transactions: []
};

const adjustmentElements = {
  message: document.getElementById("pageMessage"),
  shiftDate: document.getElementById("shiftDate"),
  loadShiftsBtn: document.getElementById("loadShiftsBtn"),
  shiftsContainer: document.getElementById("shiftsContainer"),

  adjustmentSection: document.getElementById("adjustmentSection"),
  selectedShiftInfo: document.getElementById("selectedShiftInfo"),
  adjustmentForm: document.getElementById("adjustmentForm"),

  transactionType: document.getElementById("transactionType"),
  calculationMethod: document.getElementById("calculationMethod"),
  originalValue: document.getElementById("originalValue"),
  valueLabel: document.getElementById("valueLabel"),
  transactionDate: document.getElementById("transactionDate"),
  notes: document.getElementById("notes"),

  calculatedAmount: document.getElementById("calculatedAmount"),
  calculationDetails: document.getElementById("calculationDetails"),

  saveAdjustmentBtn: document.getElementById("saveAdjustmentBtn"),
  cancelSelectionBtn: document.getElementById("cancelSelectionBtn"),

  transactionsSection: document.getElementById("transactionsSection"),
  transactionsTableBody: document.getElementById("transactionsTableBody")
};


/**
 * Initialize page.
 */
document.addEventListener("DOMContentLoaded", initializeAdjustmentsPage);


function initializeAdjustmentsPage() {
  const today = getLocalDateString();

  adjustmentElements.shiftDate.value = today;
  adjustmentElements.transactionDate.value = today;

  adjustmentElements.loadShiftsBtn.addEventListener(
    "click",
    loadShifts
  );

  adjustmentElements.transactionType.addEventListener(
    "change",
    handleTransactionTypeChange
  );

  adjustmentElements.calculationMethod.addEventListener(
    "change",
    updateCalculationPreview
  );

  adjustmentElements.originalValue.addEventListener(
    "input",
    updateCalculationPreview
  );

  adjustmentElements.adjustmentForm.addEventListener(
    "submit",
    saveAdjustment
  );

  adjustmentElements.cancelSelectionBtn.addEventListener(
    "click",
    clearSelectedShift
  );

  handleTransactionTypeChange();
}


/**
 * Load shifts for selected date.
 */
async function loadShifts() {
  const date = adjustmentElements.shiftDate.value;

  if (!date) {
    showMessage("من فضلك اختر التاريخ أولاً.", "error");
    return;
  }

  setLoading(
    adjustmentElements.loadShiftsBtn,
    true,
    "جاري التحميل..."
  );

  adjustmentElements.shiftsContainer.innerHTML =
    '<div class="empty">جاري تحميل الشيفتات...</div>';

  clearSelectedShift();

  try {
    const result = await getShiftsByDate(date);

    adjustmentState.shifts = result.records || [];

    renderShifts();

    if (adjustmentState.shifts.length === 0) {
      showMessage("لا توجد شيفتات مسجلة في هذا التاريخ.", "info");
    } else {
      hideMessage();
    }

  } catch (error) {
    adjustmentElements.shiftsContainer.innerHTML =
      '<div class="empty">تعذر تحميل الشيفتات.</div>';

    showMessage(error.message, "error");

  } finally {
    setLoading(
      adjustmentElements.loadShiftsBtn,
      false,
      "عرض الشيفتات"
    );
  }
}


/**
 * Render shifts list.
 */
function renderShifts() {
  const container = adjustmentElements.shiftsContainer;

  if (!adjustmentState.shifts.length) {
    container.innerHTML =
      '<div class="empty">لا توجد شيفتات في هذا التاريخ.</div>';
    return;
  }

  container.innerHTML = adjustmentState.shifts.map(shift => {
    const isAvailable = shift.canAddAdjustment === true;
    const isSelected =
      adjustmentState.selectedShift &&
      String(adjustmentState.selectedShift.shiftID) ===
      String(shift.shiftID);

    return `
      <div
        class="shift-card ${isAvailable ? "" : "disabled"} ${isSelected ? "selected" : ""}"
        data-shift-id="${escapeHTML(shift.shiftID)}"
        role="button"
        tabindex="0"
      >
        <div class="shift-card-header">
          <strong>${escapeHTML(shift.employeeName || "بدون اسم")}</strong>

          <span class="status ${isAvailable ? "available" : "locked"}">
            ${isAvailable ? "متاح للتعديل" : "الاستحقاق المالي مُنشأ"}
          </span>
        </div>

        <div class="shift-details">
          <div>
            <strong>كود الموظف:</strong>
            ${escapeHTML(shift.employeeID)}
          </div>

          <div>
            <strong>الشيفت:</strong>
            ${escapeHTML(shift.shiftID)}
          </div>

          <div>
            <strong>ساعات الشيفت:</strong>
            ${formatNumber(shift.shiftHours)}
          </div>

          <div>
            <strong>سعر الساعة:</strong>
            ${formatMoney(shift.hourlyRate)}
          </div>

          <div>
            <strong>قيمة الشيفت:</strong>
            ${formatMoney(shift.shiftValue)}
          </div>

          <div>
            <strong>صافي الشيفت:</strong>
            ${formatMoney(shift.totalAmount)}
          </div>
        </div>
      </div>
    `;
  }).join("");

  container.querySelectorAll(".shift-card").forEach(card => {
    const selectCard = () => {
      const shiftID = card.dataset.shiftId;

      const shift = adjustmentState.shifts.find(item =>
        String(item.shiftID) === String(shiftID)
      );

      if (shift) {
        selectShift(shift);
      }
    };

    card.addEventListener("click", selectCard);

    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectCard();
      }
    });
  });
}


/**
 * Select a shift.
 */
async function selectShift(shift) {
  adjustmentState.selectedShift = shift;

  renderShifts();

  adjustmentElements.adjustmentSection.classList.remove("hidden");
  adjustmentElements.transactionsSection.classList.remove("hidden");

  renderSelectedShiftInfo();

  const canAdd = shift.canAddAdjustment === true;

  adjustmentElements.adjustmentForm.classList.toggle(
    "hidden",
    !canAdd
  );

  if (canAdd) {
    adjustmentElements.saveAdjustmentBtn.disabled = false;
    adjustmentElements.originalValue.value = "";
    adjustmentElements.notes.value = "";
    adjustmentElements.transactionDate.value =
      adjustmentElements.shiftDate.value;

    handleTransactionTypeChange();
  }

  await loadShiftTransactions(shift.shiftID);
}


/**
 * Show selected shift information.
 */
function renderSelectedShiftInfo() {
  const shift = adjustmentState.selectedShift;

  if (!shift) return;

  const canAdd = shift.canAddAdjustment === true;

  adjustmentElements.selectedShiftInfo.innerHTML = `
    <div class="shift-card selected">
      <div class="shift-card-header">
        <strong>${escapeHTML(shift.employeeName || "بدون اسم")}</strong>
        <span class="status ${canAdd ? "available" : "locked"}">
          ${canAdd ? "يمكن إضافة معاملات" : "إضافة المعاملات غير مسموحة"}
        </span>
      </div>

      <div class="shift-details">
        <div><strong>كود الموظف:</strong> ${escapeHTML(shift.employeeID)}</div>
        <div><strong>رقم الشيفت:</strong> ${escapeHTML(shift.shiftID)}</div>
        <div><strong>سعر الساعة:</strong> ${formatMoney(shift.hourlyRate)}</div>
        <div><strong>صافي الشيفت الحالي:</strong> ${formatMoney(shift.totalAmount)}</div>
      </div>

      ${
        canAdd
          ? ""
          : '<p class="muted">لا يمكن إضافة معاملات جديدة لأن الاستحقاق المالي تم إنشاؤه لهذا الشيفت.</p>'
      }
    </div>
  `;
}


/**
 * Load transactions linked to selected shift.
 */
async function loadShiftTransactions(shiftID) {
  adjustmentElements.transactionsTableBody.innerHTML =
    '<tr><td colspan="6" class="empty">جاري تحميل المعاملات...</td></tr>';

  try {
    const response = await fetch(
      `${API_URL}?action=getShiftAdjustments&shiftID=${encodeURIComponent(shiftID)}`
    );

    if (!response.ok) {
      throw new Error("فشل الاتصال بالخادم.");
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(
        result.message || "تعذر تحميل المعاملات."
      );
    }

    adjustmentState.transactions = result.records || [];

    renderTransactions();

  } catch (error) {
    adjustmentElements.transactionsTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty">
          ${escapeHTML(error.message)}
        </td>
      </tr>
    `;
  }
}


/**
 * Render selected shift transactions.
 */
function renderTransactions() {
  const transactions = adjustmentState.transactions;

  if (!transactions.length) {
    adjustmentElements.transactionsTableBody.innerHTML =
      '<tr><td colspan="6" class="empty">لا توجد معاملات مالية لهذا الشيفت.</td></tr>';
    return;
  }

  adjustmentElements.transactionsTableBody.innerHTML =
    transactions.map(transaction => {
      return `
        <tr>
          <td>${getTransactionTypeLabel(transaction.transactionType)}</td>

          <td>${getCalculationMethodLabel(transaction.calculationMethod)}</td>

          <td>${formatNumber(transaction.originalValue)}</td>

          <td><strong>${formatMoney(transaction.amount)}</strong></td>

          <td>${escapeHTML(transaction.transactionDate || "-")}</td>

          <td>${escapeHTML(transaction.notes || "-")}</td>
        </tr>
      `;
    }).join("");
}


/**
 * Handle transaction type changes.
 */
function handleTransactionTypeChange() {
  const type = adjustmentElements.transactionType.value;
  const method = adjustmentElements.calculationMethod;

  if (type === "ADVANCE") {
    method.value = "AMOUNT";

    Array.from(method.options).forEach(option => {
      option.disabled = option.value !== "AMOUNT";
    });

  } else {
    Array.from(method.options).forEach(option => {
      option.disabled = false;
    });
  }

  updateValueLabel();
  updateCalculationPreview();
}


/**
 * Update input label based on calculation method.
 */
function updateValueLabel() {
  const method = adjustmentElements.calculationMethod.value;

  const labels = {
    HOUR: "عدد الساعات",
    MINUTE: "عدد الدقائق",
    AMOUNT: "المبلغ بالجنيه"
  };

  adjustmentElements.valueLabel.textContent =
    labels[method] || "القيمة";
}


/**
 * Calculate and show transaction preview.
 */
function updateCalculationPreview() {
  updateValueLabel();

  const shift = adjustmentState.selectedShift;

  const value = Number(
    adjustmentElements.originalValue.value
  );

  const method = adjustmentElements.calculationMethod.value;

  if (!shift || !Number.isFinite(value) || value <= 0) {
    adjustmentElements.calculatedAmount.textContent =
      "0.00 جنيه";

    adjustmentElements.calculationDetails.textContent =
      "أدخل القيمة لعرض نتيجة الحساب.";

    return;
  }

  const hourlyRate = Number(shift.hourlyRate) || 0;

  let amount = 0;
  let details = "";

  if (method === "HOUR") {
    amount = value * hourlyRate;

    details =
      `${formatNumber(value)} ساعة × ${formatMoney(hourlyRate)}`;

  } else if (method === "MINUTE") {
    amount = (value * hourlyRate) / 60;

    details =
      `${formatNumber(value)} دقيقة × سعر الساعة ÷ 60`;

  } else {
    amount = value;

    details = "المبلغ المدخل بالجنيه مباشرة.";
  }

  amount = roundMoney(amount);

  adjustmentElements.calculatedAmount.textContent =
    formatMoney(amount);

  adjustmentElements.calculationDetails.textContent =
    details;
}


/**
 * Save a new financial transaction.
 */
async function saveAdjustment(event) {
  event.preventDefault();

  const shift = adjustmentState.selectedShift;

  if (!shift) {
    showMessage("اختر الشيفت أولاً.", "error");
    return;
  }

  if (shift.canAddAdjustment !== true) {
    showMessage(
      "لا يمكن إضافة معاملة لهذا الشيفت بعد إنشاء الاستحقاق المالي.",
      "error"
    );
    return;
  }

  const transactionType = adjustmentElements.transactionType.value;
  const calculationMethod = adjustmentElements.calculationMethod.value;
  const originalValue = Number(
    adjustmentElements.originalValue.value
  );

  const transactionDate = adjustmentElements.transactionDate.value;
  const notes = adjustmentElements.notes.value.trim();

  if (!Number.isFinite(originalValue) || originalValue <= 0) {
    showMessage("أدخل قيمة صحيحة أكبر من صفر.", "error");
    return;
  }

  if (!transactionDate) {
    showMessage("اختر تاريخ المعاملة.", "error");
    return;
  }

  if (
    transactionType === "ADVANCE" &&
    calculationMethod !== "AMOUNT"
  ) {
    showMessage("السلفة يجب أن تكون مبلغاً مباشراً.", "error");
    return;
  }

  const hourlyRate = Number(shift.hourlyRate) || 0;

  let calculatedAmount = originalValue;

  if (calculationMethod === "HOUR") {
    calculatedAmount = originalValue * hourlyRate;
  } else if (calculationMethod === "MINUTE") {
    calculatedAmount = (originalValue * hourlyRate) / 60;
  }

  calculatedAmount = roundMoney(calculatedAmount);

  if (calculatedAmount <= 0) {
    showMessage(
      "المبلغ النهائي يجب أن يكون أكبر من صفر. راجع سعر الساعة والقيمة المدخلة.",
      "error"
    );
    return;
  }

  const confirmed = window.confirm(
    `تأكيد حفظ المعاملة؟\n\n` +
    `الموظف: ${shift.employeeName}\n` +
    `النوع: ${getTransactionTypeLabel(transactionType)}\n` +
    `المبلغ النهائي: ${formatMoney(calculatedAmount)}`
  );

  if (!confirmed) return;

  const data = {
    shiftID: shift.shiftID,
    transactionType: transactionType,
    calculationMethod: calculationMethod,
    originalValue: originalValue,
    transactionDate: transactionDate,
    notes: notes
  };

  setLoading(
    adjustmentElements.saveAdjustmentBtn,
    true,
    "جاري الحفظ..."
  );

  try {
    const result = await createShiftAdjustment(data);

    showMessage(
      result.message || "تم حفظ المعاملة بنجاح.",
      "success"
    );

    adjustmentElements.originalValue.value = "";
    adjustmentElements.notes.value = "";

    // Refresh shifts to show the updated financial totals.
    await loadShifts();

    const updatedShift = adjustmentState.shifts.find(item =>
      String(item.shiftID) === String(data.shiftID)
    );

    if (updatedShift) {
      await selectShift(updatedShift);
    }

  } catch (error) {
    showMessage(error.message, "error");

  } finally {
    setLoading(
      adjustmentElements.saveAdjustmentBtn,
      false,
      "حفظ المعاملة"
    );
  }
}


/**
 * Clear selected shift.
 */
function clearSelectedShift() {
  adjustmentState.selectedShift = null;
  adjustmentState.transactions = [];

  adjustmentElements.adjustmentSection.classList.add("hidden");
  adjustmentElements.transactionsSection.classList.add("hidden");

  adjustmentElements.selectedShiftInfo.innerHTML = "";

  adjustmentElements.adjustmentForm.reset();

  adjustmentElements.transactionDate.value =
    getLocalDateString();

  adjustmentElements.transactionsTableBody.innerHTML =
    '<tr><td colspan="6" class="empty">لا توجد معاملات.</td></tr>';

  updateCalculationPreview();
}


/**
 * Format transaction type.
 */
function getTransactionTypeLabel(type) {
  const labels = {
    BONUS: "مكافأة",
    DEDUCTION: "خصم",
    ADVANCE: "سلفة"
  };

  return labels[String(type || "").toUpperCase()] || type || "-";
}


/**
 * Format calculation method.
 */
function getCalculationMethodLabel(method) {
  const labels = {
    HOUR: "بالساعة",
    MINUTE: "بالدقيقة",
    AMOUNT: "مبلغ مباشر"
  };

  return labels[String(method || "").toUpperCase()] || "مبلغ مباشر";
}


/**
 * Format money.
 */
function formatMoney(value) {
  return `${formatNumber(value)} جنيه`;
}


/**
 * Format numeric values.
 */
function formatNumber(value) {
  const number = Number(value) || 0;

  return number.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}


/**
 * Round money to two decimal places.
 */
function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}


/**
 * Get local date without UTC conversion.
 */
function getLocalDateString() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


/**
 * Escape HTML values.
 */
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });
}


/**
 * Show page message.
 */
function showMessage(message, type = "info") {
  adjustmentElements.message.textContent = message;
  adjustmentElements.message.className = `message ${type}`;
  adjustmentElements.message.style.display = "block";
}


/**
 * Hide page message.
 */
function hideMessage() {
  adjustmentElements.message.textContent = "";
  adjustmentElements.message.className = "message";
  adjustmentElements.message.style.display = "none";
}


/**
 * Button loading state.
 */
function setLoading(button, loading, text) {
  if (loading) {
    button.dataset.originalText = button.textContent;
    button.disabled = true;
    button.textContent = text;
  } else {
    button.disabled = false;
    button.textContent = text || button.dataset.originalText || "";
  }
}
