export const STATUSES = {
  pending: { label: "Pending", color: "warning", icon: "mdi-clock-outline" },
  awaiting_vehicle: { label: "Awaiting vehicle", color: "primary", icon: "mdi-car-clock" },
  reserved: { label: "Reserved", color: "success", icon: "mdi-check-circle-outline" },
  returned: { label: "Returned", color: "secondary", icon: "mdi-keyboard-return" },
  cancelled: { label: "Cancelled", color: "outline", icon: "mdi-cancel" },
  denied: { label: "Denied", color: "error", icon: "mdi-close-circle-outline" },
};

export const STATUS_OPTIONS = Object.entries(STATUSES).map(([value, { label }]) => ({ value, title: label }));

/** Statuses an admin still has to act on (US-8.5). */
export const NEEDS_ACTION_STATUSES = ["pending", "awaiting_vehicle"];

/** Statuses a requester can still cancel from. */
export const OPEN_STATUSES = ["pending", "awaiting_vehicle", "reserved"];

export const CAMPUS_NAME = "Oklahoma Christian University";

export const statusMeta = (status) =>
  STATUSES[status] ?? { label: status, color: "secondary", icon: "mdi-help-circle-outline" };

export const personName = (person) => (person ? `${person.firstName} ${person.lastName}` : "");

export const vehicleLabel = (vehicle) => `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

export const destinationPlace = (destination) => [destination.city, destination.state].filter(Boolean).join(", ");

/** `addressLine1, city, state zip` for display; empty parts are skipped. */
export const destinationAddress = (destination) =>
  [destination.addressLine1, destination.addressLine2, destinationPlace(destination), destination.zipCode]
    .filter(Boolean)
    .join(", ");

const stopKey = (stop) =>
  stop.id ? `id:${stop.id}` : destinationAddress(stop).toLowerCase() || stop.name.toLowerCase();

/** True if any destination is listed twice in a row (not allowed on a trip). */
export const repeatsInARow = (stops) => stops.some((stop, i) => i > 0 && stopKey(stop) === stopKey(stops[i - 1]));

export const routeSummary = (request) => request.destinations.map(({ name }) => name).join(" → ");

const pad = (value) => String(value).padStart(2, "0");

/** Local `YYYY-MM-DD`, the format of `<input type="date">`. */
export const toDateInput = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Local `HH:MM`, the format of `<input type="time">`. */
export const toTimeInput = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

const localDay = (day) => new Date(`${day}T00:00:00`);

/** Trip start and end as local Dates. All-day trips come back from the API as `YYYY-MM-DD`. */
export const tripBounds = (request) =>
  request.all_day
    ? [localDay(request.start_at), localDay(request.end_at)]
    : [new Date(request.start_at), new Date(request.end_at)];

const formatDay = (date) => date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
const formatTime = (date) => date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

export const formatTripDates = (request) => {
  const [start, end] = tripBounds(request);
  const sameDay = toDateInput(start) === toDateInput(end);

  if (request.all_day) {
    return sameDay ? formatDay(start) : `${formatDay(start)} – ${formatDay(end)}`;
  }

  return sameDay
    ? `${formatDay(start)}, ${formatTime(start)} – ${formatTime(end)}`
    : `${formatDay(start)} ${formatTime(start)} – ${formatDay(end)} ${formatTime(end)}`;
};

/** Lowercased text a search box matches against. */
export const searchText = (request) =>
  [
    `#${request.id}`,
    request.purpose,
    request.area?.name,
    personName(request.user),
    statusMeta(request.status).label,
    ...request.destinations.flatMap((destination) => [destination.name, destinationPlace(destination)]),
    ...request.drivers.map(personName),
    ...request.vehicles.flatMap((vehicle) => [vehicleLabel(vehicle), vehicle.universityId]),
  ]
    .join(" ")
    .toLowerCase();

/** True if the trip touches any day in `from`–`to` (`YYYY-MM-DD`, either may be empty). */
export const overlapsDays = (request, from, to) => {
  const [start, end] = tripBounds(request);
  const afterTo = to && start >= new Date(localDay(to).getTime() + 24 * 60 * 60 * 1000);
  const beforeFrom = from && end < localDay(from);
  return !afterTo && !beforeFrom;
};

/** "October 2026" for month view; "Oct 25 – 31, 2026" (or across months/years) for the week containing `day`. */
export const calendarTitle = (day, view) => {
  const focus = localDay(day);
  if (view === "month") {
    return focus.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }

  const start = new Date(focus);
  start.setDate(focus.getDate() - focus.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const sameYear = start.getFullYear() === end.getFullYear();
  const startText = start.toLocaleDateString(undefined, { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
  const endText = end.toLocaleDateString(undefined, {
    ...(start.getMonth() === end.getMonth() && sameYear ? {} : { month: "short" }),
    day: "numeric",
    year: "numeric",
  });
  return `${startText} – ${endText}`;
};

/** A `v-calendar` event for the request. All-day trips use date strings so they render as all-day. */
export const calendarEvent = (request) => {
  const [start, end] = tripBounds(request);

  return {
    name: request.purpose,
    start: request.all_day ? request.start_at : start,
    end: request.all_day ? request.end_at : end,
    timed: !request.all_day,
    color: statusMeta(request.status).color,
    request,
  };
};

/** Seats across `vehicles` and whether they cover the people on the request (FR-004). */
export const capacityCheck = (vehicles, people) => {
  const seats = vehicles.reduce((sum, vehicle) => sum + vehicle.passengerCapacity, 0);
  return { seats, short: vehicles.length > 0 && seats < people };
};
