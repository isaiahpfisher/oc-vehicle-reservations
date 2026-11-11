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
  const serviceTypeId = requiredId(form?.serviceTypeId);
  if (!userId || !serviceTypeId) {
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
    return { message: "Invalid serviced at." };
  }

  return { value: { userId, serviceTypeId, miles, maintenanceNeedId, servicedAt } };
};

export const userName = (log) => [log?.user?.firstName, log?.user?.lastName].filter(Boolean).join(" ");

export const vehicleLabel = (log) => log?.vehicle?.universityId ?? "";

export const serviceTypeName = (log) => log?.serviceType?.name ?? "";

export const mileageReading = (log) => log?.mileageLog?.odometerReading ?? "";
