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
  // Feature 14: closed because the work moved to a maintenance need. Behaves like Resolved.
  { title: "Moved to maintenance", value: "moved_to_maintenance" },
];

/** Statuses that close a report on a date (Resolved, Moved to maintenance). */
export const CLOSED_ON_STATUSES = ["resolved", "moved_to_maintenance"];

export const closesOnDate = (status) => CLOSED_ON_STATUSES.includes(status);

/** The date field's label for a closing status. */
export const closedOnLabel = (status) => (status === "moved_to_maintenance" ? "Moved on" : "Resolved on");

const labelFor = (options, value) => options.find((option) => option.value === value)?.title ?? "";

export const typeLabel = (value) => labelFor(ISSUE_TYPES, value);

export const statusLabel = (value) => labelFor(ISSUE_STATUSES, value);

export const personName = (person) => [person?.firstName, person?.lastName].filter(Boolean).join(" ");

/* Feature 14 (US-14.6): display details for the issue report form. */

/** What each problem type covers, shown on the type tiles. */
export const ISSUE_TYPE_DETAILS = {
  low_gas: { icon: "mdi-gas-station-outline", hint: "Fuel is low or empty" },
  dirty: { icon: "mdi-spray-bottle", hint: "Needs cleaning inside or out" },
  maintenance: { icon: "mdi-wrench-outline", hint: "Something is broken or due for service" },
  other: { icon: "mdi-dots-horizontal-circle-outline", hint: "Keys, missing items, anything else" },
};

/** Status chip and toggle details. Color is never the only signal: each has an icon and a label. */
export const ISSUE_STATUS_DETAILS = {
  pending: { icon: "mdi-progress-clock", color: "warning", meaning: "Waiting for staff to take care of it." },
  resolved: { icon: "mdi-check-circle-outline", color: "success", meaning: "Taken care of." },
  cancelled: { icon: "mdi-close-circle-outline", color: "grey", meaning: "Closed without a fix." },
  moved_to_maintenance: { icon: "mdi-tools", color: "info", meaning: "Closed: the work is tracked as a maintenance need." },
};

export const statusDetails = (value) => ISSUE_STATUS_DETAILS[value] ?? ISSUE_STATUS_DETAILS.pending;

/** A new report: pending, nothing else chosen. */
export const blankIssueReportForm = () => ({
  vehicleId: null,
  vehicleRequestId: null,
  type: null,
  description: "",
  status: "pending",
  assigneeId: null,
  resolvedAt: "",
});

/** Today as `yyyy-mm-dd` in local time (the default resolved date). */
export const todayInput = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

/** `V-100 · 2022 Ford Transit` when the details are known, else the university id. */
export const vehicleOptionLabel = (vehicle) =>
  [vehicle.universityId, [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")].filter(Boolean).join(" · ");

/**
 * Choosing a trip fills in its vehicle when it has exactly one, and clears a vehicle that wasn't on the trip.
 * A trip with no vehicles (or no trip) leaves the vehicle alone.
 */
export const withTrip = (form, trip) => {
  const tripVehicles = trip?.vehicles ?? [];
  if (!tripVehicles.length) return form;
  if (tripVehicles.length === 1) return { ...form, vehicleId: tripVehicles[0].id };
  return tripVehicles.some(({ id }) => id === form.vehicleId) ? form : { ...form, vehicleId: null };
};

/** Feature 14 (US-14.7): a maintenance need title (50 characters max) from an issue report's description. */
export const needTitleFrom = (description) => {
  const line = String(description ?? "").trim().split("\n")[0].trim();
  if (!line) return "Maintenance Needed";
  if (line.length <= 50) return line;
  const cut = line.slice(0, 49);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 20 ? cut.lastIndexOf(" ") : 49).trimEnd()}…`;
};

const ROLE_LABELS = { admin: "Admin", area_admin: "Area admin", maintenance: "Maintenance" };

/** "Maintenance · Area admin" for an assignee option. */
export const assigneeRoles = (person) => (person.roles ?? []).map((role) => ROLE_LABELS[role] ?? role).join(" · ");

/** Each vehicle once, from a list of trips. */
export const vehiclesOfTrips = (trips) => {
  const seen = new Map();
  for (const trip of trips) {
    for (const vehicle of trip.vehicles ?? []) {
      if (!seen.has(vehicle.id)) seen.set(vehicle.id, vehicle);
    }
  }
  return [...seen.values()];
};

/** The editable fields of a saved report, in the shape the form and `validateIssueReportForm` use. */
export const toIssueReportForm = (report) => ({
  vehicleId: report.vehicleId,
  vehicleRequestId: report.vehicleRequestId,
  type: report.type,
  description: report.description,
  status: report.status,
  assigneeId: report.assigneeId,
  resolvedAt: report.resolvedAt ?? "",
});

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

  if (closesOnDate(form.status) && !calendarDate(form.resolvedAt)) {
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
      resolvedAt: closesOnDate(form.status) ? String(form.resolvedAt).trim() : null,
    },
  };
};
