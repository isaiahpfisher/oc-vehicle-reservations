export const ISSUE_TYPES = [
  { title: "Low gas", value: "low_gas" },
  { title: "Dirty", value: "dirty" },
  { title: "Maintenance", value: "maintenance" },
  { title: "Other", value: "other" },
];

export const ISSUE_STATUSES = [
  { title: "Pending", value: "pending" },
  { title: "Resolved", value: "resolved" },
  { title: "Cancelled", value: "cancelled" },
];

const labelFor = (options, value) => options.find((option) => option.value === value)?.title ?? "";

export const typeLabel = (value) => labelFor(ISSUE_TYPES, value);

export const statusLabel = (value) => labelFor(ISSUE_STATUSES, value);

export const personName = (person) => [person?.firstName, person?.lastName].filter(Boolean).join(" ");

const calendarDate = (value) => {
  const text = String(value ?? "").trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

/** Client checks for the issue report dialog. Returns `{ message }` or `{ value }`. */
export const validateIssueReportForm = (form) => {
  if (form?.vehicleId === undefined || form?.vehicleId === null || form.vehicleId === "") {
    return { message: "Required field." };
  }

  if (!form?.type) {
    return { message: "Required field." };
  }

  if (!String(form?.description ?? "").trim()) {
    return { message: "Required field." };
  }

  if (!form?.status) {
    return { message: "Required field." };
  }

  if (form.status === "resolved" && !calendarDate(form.resolvedAt)) {
    return { message: "Required field." };
  }

  return {
    value: {
      vehicleId: Number(form.vehicleId),
      vehicleRequestId: form.vehicleRequestId || null,
      assigneeId: form.assigneeId || null,
      type: form.type,
      description: String(form.description).trim(),
      status: form.status,
      resolvedAt: form.status === "resolved" ? String(form.resolvedAt).trim() : null,
    },
  };
};
