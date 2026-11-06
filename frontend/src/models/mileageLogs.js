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

/** Client checks for the mileage log dialog. Returns `{ message }` or `{ value }`. */
export const validateMileageLogForm = (form) => {
  const reading = form?.odometerReading;
  const recordedAt = form?.recordedAt;

  if (reading === undefined || reading === null || String(reading).trim() === "") {
    return { message: "Required field." };
  }

  if (recordedAt === undefined || recordedAt === null || String(recordedAt).trim() === "") {
    return { message: "Required field." };
  }

  const text = String(reading).trim();
  if (!/^-?\d+$/.test(text)) {
    return { message: "Odometer reading must be a whole number." };
  }

  const odometerReading = Number(text);
  if (odometerReading < 0) {
    return { message: "Odometer reading must be zero or greater." };
  }

  if (!calendarDate(recordedAt)) {
    return { message: "Invalid recorded date." };
  }

  return { value: { odometerReading, recordedAt: String(recordedAt).trim() } };
};

export const addedByName = (log) => [log?.user?.firstName, log?.user?.lastName].filter(Boolean).join(" ");
