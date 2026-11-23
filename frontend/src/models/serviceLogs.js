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

const requiredId = (value) => {
  if (value && typeof value === "object") {
    return requiredId(value.id);
  }

  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }

  const text = String(value).trim();
  if (!/^\d+$/.test(text) || Number(text) < 1) {
    return null;
  }

  return Number(text);
};

/** Client checks for the service log form. Returns `{ message }` or `{ value }`. */
export const validateServiceLogForm = (form) => {
  const userId = requiredId(form?.userId);
  // UI/UX backlog #26: a new visit can log several services (`serviceTypeIds`); an edit changes one (`serviceTypeId`).
  const many = Array.isArray(form?.serviceTypeIds);
  const serviceTypeIds = many ? form.serviceTypeIds.map(requiredId) : null;
  const serviceTypeId = many ? null : requiredId(form?.serviceTypeId);
  if (!userId || (many ? !serviceTypeIds.length || serviceTypeIds.some((id) => !id) : !serviceTypeId)) {
    return { message: "Required field." };
  }

  if (form?.miles === undefined || form?.miles === null || String(form.miles).trim() === "") {
    return { message: "Required field." };
  }

  const milesText = String(form.miles).trim();
  if (!/^-?\d+$/.test(milesText)) {
    return { message: "Mileage must be a whole number." };
  }

  const miles = Number(milesText);
  if (miles < 0) {
    return { message: "Mileage must be zero or greater." };
  }

  const maintenanceText =
    form?.maintenanceNeedId === undefined || form?.maintenanceNeedId === null
      ? ""
      : String(form.maintenanceNeedId).trim();
  let maintenanceNeedId = null;
  if (maintenanceText !== "") {
    if (!/^\d+$/.test(maintenanceText) || Number(maintenanceText) < 1) {
      return { message: "Invalid maintenance need." };
    }

    maintenanceNeedId = Number(maintenanceText);
  }

  if (form?.servicedAt === undefined || form?.servicedAt === null || String(form.servicedAt).trim() === "") {
    return { message: "Required field." };
  }

  const servicedAt = String(form.servicedAt).trim();
  if (!calendarDate(servicedAt)) {
    return { message: "Enter a real serviced date." };
  }

  return {
    value: { userId, ...(many ? { serviceTypeIds } : { serviceTypeId }), miles, maintenanceNeedId, servicedAt },
  };
};

export const userName = (log) => [log?.user?.firstName, log?.user?.lastName].filter(Boolean).join(" ");

export const vehicleLabel = (log) => log?.vehicle?.universityId ?? "";

export const serviceTypeName = (log) => log?.serviceType?.name ?? "";

export const mileageReading = (log) => log?.mileageLog?.odometerReading ?? "";

export const maintenanceNeedTitle = (log) => log?.maintenanceNeed?.title ?? "";

/**
 * UI/UX backlog #54: service logs grouped into visits, the logs that share one odometer reading (`mileageLogId`).
 * Each visit: `{ id, mileageLogId, logs, servicedAt, miles, services, people, needs, userId, maintenanceNeedId,
 * serviceTypeIds }`, services alphabetical, newest visit first.
 */
export const groupVisits = (logs) => {
  const byVisit = new Map();
  logs.forEach((log) => {
    const id = log.mileageLogId ?? `log-${log.id}`;
    const visit = byVisit.get(id) ?? { id, mileageLogId: log.mileageLogId ?? null, logs: [] };
    visit.logs.push(log);
    byVisit.set(id, visit);
  });

  const unique = (values) => [...new Set(values.filter(Boolean))];
  return [...byVisit.values()]
    .map((visit) => {
      const first = visit.logs[0];
      const needs = new Map(visit.logs.filter((log) => log.maintenanceNeed).map((log) => [log.maintenanceNeed.id, log.maintenanceNeed]));
      return {
        ...visit,
        servicedAt: first.servicedAt,
        miles: mileageReading(first),
        services: unique(visit.logs.map(serviceTypeName)).sort((a, b) => a.localeCompare(b)),
        people: unique(visit.logs.map(userName)),
        needs: [...needs.values()],
        userId: first.userId,
        maintenanceNeedId: visit.logs.find((log) => log.maintenanceNeedId)?.maintenanceNeedId ?? null,
        serviceTypeIds: unique(visit.logs.map((log) => log.serviceTypeId)),
      };
    })
    .sort((a, b) => String(b.servicedAt).localeCompare(String(a.servicedAt)) || Number(b.logs[0].id) - Number(a.logs[0].id));
};

/** "Oil change", or "Oil change +2" for a visit with several services. */
export const visitServicesText = (visit) =>
  visit.services.length > 1 ? `${visit.services[0]} +${visit.services.length - 1}` : visit.services[0] ?? "Service";

/**
 * Calendar events for service visits (see `groupVisits`), one per visit on its day. `prefix(visit)` adds the vehicle
 * where the calendar covers several ("MUS-M01 · Oil change +2").
 */
export const visitEvents = (visits, prefix = () => "") =>
  visits.map((visit) => ({
    name: [prefix(visit), visitServicesText(visit)].filter(Boolean).join(" · "),
    start: visit.servicedAt,
    // Green: done. (Maroon would look like the red "overdue".)
    color: "success",
    kind: "visit",
    visit,
  }));

/**
 * Calendar events for services that are overdue or due soon by date (Feature 18's per-vehicle service states), each on
 * its due date: "V-100 · Oil change", red when overdue and orange when due soon (the vehicle comes first, so a narrow
 * day cell still shows it). Services due only by miles have no date, so they aren't on the calendar. Retired vehicles
 * are left out.
 */
export const dueEvents = (vehicles, { withVehicle = true } = {}) =>
  vehicles
    .filter((vehicle) => vehicle.status !== "retired")
    .flatMap((vehicle) =>
      (vehicle.condition?.services ?? [])
        .filter(({ state, dueDate }) => dueDate && (state === "overdue" || state === "due_soon"))
        .map(({ serviceType, state, dueDate }) => ({
          name: [withVehicle ? vehicle.universityId : "", serviceType.name].filter(Boolean).join(" · "),
          start: String(dueDate).slice(0, 10),
          color: state === "overdue" ? "error" : "warning",
          kind: "due",
          vehicle,
          serviceType,
          state,
        })),
    );

/** The key under a service calendar. */
export const SERVICE_CALENDAR_LEGEND = [
  { label: "Serviced", color: "success" },
  { label: "Due soon", color: "warning" },
  { label: "Overdue", color: "error" },
];
