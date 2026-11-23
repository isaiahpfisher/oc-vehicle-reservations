/** Feature 18, FR-002: a vehicle's status, highest priority first. */
export const VEHICLE_STATUSES = {
  retired: { label: "Retired", color: "secondary", icon: "mdi-archive-outline" },
  out_of_service: { label: "Out of Service", color: "error", icon: "mdi-car-off" },
  service_overdue: { label: "Service Overdue", color: "error", icon: "mdi-wrench-clock" },
  plate_expired: { label: "Plate Expired", color: "warning", icon: "mdi-card-bulleted-off-outline" },
  service_due_soon: { label: "Service Due Soon", color: "warning", icon: "mdi-wrench-outline" },
  plate_expiring: { label: "Plate Expiring", color: "warning", icon: "mdi-calendar-alert" },
  available: { label: "Available", color: "success", icon: "mdi-check-circle-outline" },
};

export const VEHICLE_STATUS_OPTIONS = Object.entries(VEHICLE_STATUSES).map(([value, { label }]) => ({ value, title: label }));

/** US-18.13: statuses a maintenance user should work on. Retired and available vehicles need nothing. */
export const NEEDS_ATTENTION_STATUSES = ["out_of_service", "service_overdue", "plate_expired", "service_due_soon", "plate_expiring"];

export const vehicleStatusMeta = (status) =>
  VEHICLE_STATUSES[status] ?? { label: status ?? "Unknown", color: "secondary", icon: "mdi-help-circle-outline" };

export const needsAttention = (vehicle) => NEEDS_ATTENTION_STATUSES.includes(vehicle.condition?.status);

/** UI/UX backlog: a VIN is 17 letters and digits, never I, O, or Q (the API checks the same). */
export const VIN_CHARACTERS_MESSAGE = "VIN can only use letters and numbers, and never I, O, or Q.";

export const isVinCharacters = (vin) => /^[A-HJ-NPR-Z0-9]*$/i.test(String(vin ?? ""));

/**
 * UI/UX backlog: a vehicle can't be bought before the year before its model year (a 2027 model sells in 2026).
 * Returns the API's message, or "" when the year or date is missing or they fit.
 */
export const purchaseDateMessage = (year, purchasedAt) => {
  const modelYear = Number(year);
  const purchaseYear = Number(String(purchasedAt ?? "").slice(0, 4));
  if (!modelYear || !purchaseYear || purchaseYear >= modelYear - 1) return "";
  return `Purchase date must be in ${modelYear - 1} or later for a ${modelYear} vehicle.`;
};

/** "2015 Toyota Sienna". */
export const vehicleName = (vehicle) => [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ");

/** UI/UX backlog #37: the one label for a vehicle everywhere a list or picker names it: "V-100 · 2015 Toyota Sienna". */
export const vehicleLabel = (vehicle) => [vehicle?.universityId, vehicle ? vehicleName(vehicle) : ""].filter(Boolean).join(" · ");

export const formatMiles = (miles) => `${Math.round(miles).toLocaleString()} mi`;

/** `YYYY-MM-DD` → "Oct 1, 2026". */
export const formatDay = (day) =>
  day ? new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";

/** US-18.3 / US-18.14: how the estimate was worked out, e.g. "12,000 logged Oct 1, 2026 + ~340 from 2 trips". */
export const mileageDetail = ({ reading, tripMiles, tripCount, unknownTripCount }) => {
  const parts = [reading ? `${reading.odometerReading.toLocaleString()} logged ${formatDay(reading.recordedAt)}` : "0 at purchase"];
  if (tripCount) {
    parts.push(`~${tripMiles.toLocaleString()} from ${tripCount} trip${tripCount === 1 ? "" : "s"}`);
  }

  const notes = [
    unknownTripCount ? `${unknownTripCount} trip${unknownTripCount === 1 ? "" : "s"} with unknown miles` : "",
    reading ? "" : "no mileage logs yet",
  ].filter(Boolean);
  return [parts.join(" + "), ...notes].join("; ");
};

/** "A", "A and B", "A, B and C", "A, B, C and 2 more" — long lists stay one readable line. */
export const nameList = (names, shown = 3) => {
  if (names.length <= 1) return names.join("");
  if (names.length <= shown) return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  return `${names.slice(0, shown).join(", ")} and ${names.length - shown} more`;
};

const shortDay = (day) => new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export const SERVICE_STATES = {
  overdue: { label: "Overdue", color: "error" },
  due_soon: { label: "Due soon", color: "warning" },
  ok: { label: "OK", color: "success" },
  never_due: { label: "No schedule", color: "secondary" },
};

const plural = (count, unit) => `${Math.abs(count).toLocaleString()} ${unit}${Math.abs(count) === 1 ? "" : "s"}`;

/** "in 1,200 mi", "300 mi overdue". */
export const milesLeftText = (milesLeft) =>
  milesLeft === null ? "" : milesLeft < 0 ? `${formatMiles(-milesLeft)} overdue` : `in ${formatMiles(milesLeft)}`;

/** "in 12 days", "3 days overdue", "today". */
export const daysLeftText = (daysLeft) =>
  daysLeft === null ? "" : daysLeft === 0 ? "today" : daysLeft < 0 ? `${plural(daysLeft, "day")} overdue` : `in ${plural(daysLeft, "day")}`;

/** Assign dialog subtitle (US-18.7): "service in 1,200 mi or by Dec 3, 2026". */
export const nextServiceText = ({ milesLeft, dueDate } = {}) => {
  const parts = [];
  if (milesLeft != null) parts.push(milesLeft < 0 ? `${formatMiles(-milesLeft)} overdue` : `in ${formatMiles(milesLeft)}`);
  if (dueDate) parts.push(`by ${formatDay(dueDate)}`);
  return parts.length ? `service ${parts.join(" or ")}` : "";
};

/* ---------- Grouping, so a vehicle with many problems still reads in a line or two ---------- */

export const PROBLEM_LABELS = {
  retired: "Retired",
  out_of_service: "Out of service",
  booked: "Booked",
  service_due: "Service due",
  plate_expires: "Plate expires",
  license_expires: "License expires",
};

const PROBLEM_ORDER = Object.keys(PROBLEM_LABELS);
const rank = (type) => (PROBLEM_ORDER.includes(type) ? PROBLEM_ORDER.indexOf(type) : PROBLEM_ORDER.length);

/**
 * Services due during a trip, one sentence per cause (overdue, by date, by the trip's miles). A cause with one service
 * keeps the server's own sentence; several share one: "Service due Jan 19, 2027, before the trip ends: A and B."
 */
const serviceLines = (list) => {
  if (!list.every(({ due }) => due)) {
    // Older API without `due`: say how many rather than gluing sentences together.
    return [{ cause: "any", text: list.length === 1 ? list[0].message : `${list.length} services are due before the trip ends.`, list }];
  }

  return ["overdue", "date", "miles"].flatMap((cause) => {
    const group = list.filter(({ due }) => due === cause);
    if (!group.length) return [];
    if (group.length === 1) return [{ cause, text: group[0].message, list: group }];

    const names = nameList(group.map(({ service }) => service));
    let text;
    if (cause === "overdue") {
      text = `Overdue for service: ${names}.`;
    } else if (cause === "date") {
      const sorted = [...group].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      text =
        new Set(group.map(({ dueDate }) => dueDate)).size === 1
          ? `Service due ${formatDay(group[0].dueDate)}, before the trip ends: ${names}.`
          : `Service due before the trip ends: ${nameList(sorted.map(({ service, dueDate }) => `${service} (${shortDay(dueDate)})`))}.`;
    } else {
      text = `Service due during this trip (about ${formatMiles(group[0].tripMiles)}): ${names}.`;
    }
    return [{ cause, text, list: group }];
  });
};

/**
 * One line per kind of problem (blocking kinds first); services due get one line per cause (see `serviceLines`).
 * `detail` keeps every original message for a tooltip.
 */
export const groupProblems = (problems = []) => {
  const byType = new Map();
  problems.forEach((problem) => byType.set(problem.type, [...(byType.get(problem.type) ?? []), problem]));

  return [...byType.entries()]
    .sort(([a], [b]) => rank(a) - rank(b))
    .flatMap(([type, list]) => {
      const base = { type, label: PROBLEM_LABELS[type] ?? type, blocking: list.some(({ blocking }) => blocking) };
      const lines = type === "service_due" ? serviceLines(list) : [{ cause: type, text: list.map(({ message }) => message).join(" "), list }];
      return lines.map(({ cause, text, list: group }) => ({
        ...base,
        key: `${type}:${cause}`,
        text,
        detail: group.map(({ message }) => message).join("\n"),
      }));
    });
};

/** One chip per kind of problem, however many lines it takes. */
export const problemKinds = (problems = []) => [...new Map(groupProblems(problems).map((line) => [line.type, line])).values()];

const SERVICE_RANK = { overdue: 0, due_soon: 1, ok: 2, never_due: 3 };

/** Most urgent first; within a state, soonest due first. */
export const sortServices = (services = []) =>
  [...services].sort(
    (a, b) =>
      SERVICE_RANK[a.state] - SERVICE_RANK[b.state] ||
      (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity) ||
      (a.milesLeft ?? Infinity) - (b.milesLeft ?? Infinity) ||
      a.serviceType.name.localeCompare(b.serviceType.name),
  );

export const isUrgentService = ({ state }) => state === "overdue" || state === "due_soon";

/**
 * Why a vehicle has its status, one short line per status that applies (US-18.3). A retired vehicle only says it's
 * retired: its service schedule no longer matters.
 */
export const statusLines = ({ status, reasons = [], services = [], outOfServiceNeeds = [] } = {}) => {
  if (status === "retired") {
    return [{ status, text: "Retired, so it can't be assigned to trips" }];
  }

  const names = (state) => services.filter((service) => service.state === state).map(({ serviceType }) => serviceType.name);
  const lines = [];
  if (outOfServiceNeeds.length) lines.push({ status: "out_of_service", text: `Out of service: ${nameList(outOfServiceNeeds.map(({ title }) => title))}` });
  if (names("overdue").length) lines.push({ status: "service_overdue", text: `Overdue: ${nameList(names("overdue"))}` });
  reasons
    .filter((reason) => reason.status === "plate_expired")
    .forEach(({ message }) => lines.push({ status: "plate_expired", text: message.replace(/\.$/, "") }));
  if (names("due_soon").length) lines.push({ status: "service_due_soon", text: `Due soon: ${nameList(names("due_soon"))}` });
  reasons
    .filter((reason) => reason.status === "plate_expiring")
    .forEach(({ message }) => lines.push({ status: "plate_expiring", text: message.replace(/\.$/, "") }));
  return lines;
};

/** "in 2,660 mi · in 150 days", "120 mi overdue" — what's left until a service is due. */
export const dueLeftText = ({ milesLeft, daysLeft }) => [milesLeftText(milesLeft), daysLeftText(daysLeft)].filter(Boolean).join(" · ");

