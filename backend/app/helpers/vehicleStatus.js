import { Op } from "sequelize";
import db from "../models/index.js";

/** Feature 18, FR-002: service is "due soon" this many miles or days ahead. */
export const DUE_SOON_MILES = 500;
export const DUE_SOON_DAYS = 14;
/** Requests in these statuses don't hold their vehicles (Feature 8). */
export const RELEASED_STATUSES = ["cancelled", "denied"];
/** Requests still headed for a trip. Only these are flagged (US-18.9, US-18.10). */
export const ACTIVE_REQUEST_STATUSES = ["pending", "awaiting_vehicle", "reserved"];
/** Maintenance needs in these statuses take an out-of-service vehicle off the road (US-18.4). */
const UNRESOLVED_NEED_STATUSES = ["Open", "In Progress"];

const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (value) => String(value).padStart(2, "0");

/** Local `YYYY-MM-DD`, the format of DATEONLY columns. */
export const localDay = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const addDays = (day, days) => {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const daysBetween = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);

const dayFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const formatDay = (day) => dayFormat.format(new Date(`${day}T00:00:00Z`));
const formatMiles = (miles) => `${miles.toLocaleString("en-US")} mi`;

/** A request date as `YYYY-MM-DD`. All-day trips are stored at UTC midnight (Feature 8), timed trips are local. */
const tripDay = (allDay, value) => (allDay ? new Date(value).toISOString().slice(0, 10) : localDay(new Date(value)));

/** All-day trips run through the end of their last day. */
export const tripEnd = ({ endAt, allDay }) => new Date(new Date(endAt).getTime() + (allDay ? DAY_MS : 0));

const overlaps = (a, b) => new Date(a.startAt) < tripEnd(b) && new Date(b.startAt) < tripEnd(a);

const groupBy = (rows, key) => {
  const groups = new Map();
  rows.forEach((row) => groups.set(row[key], [...(groups.get(row[key]) ?? []), row]));
  return groups;
};

/**
 * FR-003: the latest reading plus the estimated miles of every trip that ended since it.
 * `logs` are newest first. Without a reading, the vehicle starts from 0 (it has no initial-mileage column).
 */
const estimateMileage = (logs, trips) => {
  const [reading] = logs;
  const counted = reading ? trips.filter((trip) => tripDay(trip.allDay, trip.startAt) > reading.recordedAt) : trips;
  const tripMiles = counted.reduce((sum, trip) => sum + (trip.estimatedMiles ?? 0), 0);

  return {
    miles: (reading?.odometerReading ?? 0) + tripMiles,
    reading: reading ? { odometerReading: reading.odometerReading, recordedAt: reading.recordedAt } : null,
    tripMiles,
    tripCount: counted.length,
    unknownTripCount: counted.filter((trip) => trip.estimatedMiles === null).length,
  };
};

const serviceState = ({ milesLeft, daysLeft }) => {
  if (milesLeft === null && daysLeft === null) {
    return "never_due";
  }

  if ((milesLeft !== null && milesLeft < 0) || (daysLeft !== null && daysLeft < 0)) {
    return "overdue";
  }

  if ((milesLeft !== null && milesLeft <= DUE_SOON_MILES) || (daysLeft !== null && daysLeft <= DUE_SOON_DAYS)) {
    return "due_soon";
  }

  return "ok";
};

/** FR-004: next due from the last service of this type, or from purchase at 0 miles when never serviced. */
const nextService = (serviceType, last, vehicle, miles, today) => {
  const everyDays = serviceType.service_frequency_days;
  const everyMiles = serviceType.service_frequency_miles;
  const fromMiles = last ? (last.mileageLog?.odometerReading ?? 0) : 0;
  const dueDate = everyDays ? addDays(last?.servicedAt ?? vehicle.purchasedAt, everyDays) : null;
  const dueMiles = everyMiles ? fromMiles + everyMiles : null;
  const left = {
    milesLeft: dueMiles === null ? null : dueMiles - miles,
    daysLeft: dueDate === null ? null : daysBetween(today, dueDate),
  };

  return {
    serviceType: { id: serviceType.id, name: serviceType.name, frequencyDays: everyDays, frequencyMiles: everyMiles },
    lastServicedAt: last?.servicedAt ?? null,
    lastServiceMiles: last ? fromMiles : null,
    dueDate,
    dueMiles,
    ...left,
    state: serviceState(left),
  };
};

/** "in 300 mi or 5 days", "by 120 mi and 3 days" — the parts of a service that triggered `state`. */
const dueDetail = ({ milesLeft, daysLeft }, overdue) => {
  const hit = (left, limit) => left !== null && (overdue ? left < 0 : left <= limit);
  const parts = [];
  if (hit(milesLeft, DUE_SOON_MILES)) parts.push(formatMiles(Math.abs(milesLeft)));
  if (hit(daysLeft, DUE_SOON_DAYS)) parts.push(`${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"}`);
  return parts.join(overdue ? " and " : " or ");
};

/** FR-002: every reason that applies, in priority order. The first one is the vehicle's status. */
const statusReasons = (vehicle, { needs, services, today }) => {
  const reasons = [];
  const add = (status, message) => reasons.push({ status, message });

  if (vehicle.status === "retired") add("retired", "Retired.");
  needs.forEach((need) => add("out_of_service", `Out of service: ${need.title}.`));
  services
    .filter(({ state }) => state === "overdue")
    .forEach((service) => add("service_overdue", `${service.serviceType.name} is overdue by ${dueDetail(service, true)}.`));
  if (vehicle.licensePlateExpirationDate && vehicle.licensePlateExpirationDate < today) {
    add("plate_expired", `License plate expired ${formatDay(vehicle.licensePlateExpirationDate)}.`);
  }
  services
    .filter(({ state }) => state === "due_soon")
    .forEach((service) => add("service_due_soon", `${service.serviceType.name} is due in ${dueDetail(service, false)}.`));

  return reasons;
};

/**
 * Feature 18: each vehicle's status and the facts behind it, by vehicle id.
 * `{ status, reasons, mileage, services, outOfServiceNeeds }` — see features/reference/api.md.
 */
export const loadConditions = async (vehicles, now = new Date()) => {
  const ids = vehicles.map(({ id }) => id);
  if (!ids.length) {
    return new Map();
  }

  const today = localDay(now);
  const [mileageLogs, serviceLogs, serviceTypes, needs, tripRows] = await Promise.all([
    db.mileageLog.findAll({
      where: { vehicleId: ids },
      attributes: ["id", "vehicleId", "odometerReading", "recordedAt"],
      order: [
        ["recordedAt", "DESC"],
        ["id", "DESC"],
      ],
    }),
    db.serviceLog.findAll({
      where: { vehicleId: ids },
      attributes: ["id", "vehicleId", "serviceTypeId", "servicedAt"],
      include: [{ model: db.mileageLog, as: "mileageLog", attributes: ["odometerReading"] }],
      order: [
        ["servicedAt", "DESC"],
        ["id", "DESC"],
      ],
    }),
    db.serviceType.findAll({ order: [["name", "ASC"]] }),
    db.maintenanceNeed.findAll({
      where: { vehicleId: ids, outOfService: true, status: UNRESOLVED_NEED_STATUSES },
      attributes: ["id", "vehicleId", "title", "status", "priority"],
      order: [["id", "ASC"]],
    }),
    db.vehicleRequestVehicle.findAll({
      where: { vehicleId: ids },
      attributes: ["vehicleId"],
      include: [
        {
          model: db.vehicleRequest,
          as: "vehicleRequest",
          attributes: ["id", "startAt", "endAt", "allDay", "estimatedMiles"],
          where: { status: { [Op.notIn]: RELEASED_STATUSES }, startAt: { [Op.lt]: now } },
        },
      ],
    }),
  ]);

  const logsByVehicle = groupBy(mileageLogs, "vehicleId");
  const servicesByVehicle = groupBy(serviceLogs, "vehicleId");
  const needsByVehicle = groupBy(needs, "vehicleId");
  const tripsByVehicle = groupBy(
    tripRows
      .filter(({ vehicleRequest }) => tripEnd(vehicleRequest) <= now)
      .map(({ vehicleId, vehicleRequest }) => ({ vehicleId, ...vehicleRequest.toJSON() })),
    "vehicleId",
  );

  return new Map(
    vehicles.map((vehicle) => {
      const mileage = estimateMileage(logsByVehicle.get(vehicle.id) ?? [], tripsByVehicle.get(vehicle.id) ?? []);
      const logs = servicesByVehicle.get(vehicle.id) ?? [];
      const services = serviceTypes.map((type) =>
        nextService(type, logs.find(({ serviceTypeId }) => serviceTypeId === type.id), vehicle, mileage.miles, today),
      );
      const vehicleNeeds = needsByVehicle.get(vehicle.id) ?? [];
      const reasons = statusReasons(vehicle, { needs: vehicleNeeds, services, today });

      return [
        vehicle.id,
        {
          status: reasons[0]?.status ?? "available",
          reasons,
          mileage,
          services,
          outOfServiceNeeds: vehicleNeeds.map(({ id, title, status, priority }) => ({ id, title, status, priority })),
        },
      ];
    }),
  );
};

/**
 * For each trip `{ id, startAt, endAt, allDay, vehicleIds }`, the other requests holding each of its vehicles at
 * the same time (FR-005): Map trip id → Map vehicle id → request ids.
 */
export const findBookings = async (trips) => {
  const result = new Map(trips.map(({ id }) => [id, new Map()]));
  const vehicleIds = [...new Set(trips.flatMap((trip) => trip.vehicleIds))];
  if (!vehicleIds.length) {
    return result;
  }

  const earliest = Math.min(...trips.map((trip) => new Date(trip.startAt).getTime()));
  const latest = Math.max(...trips.map((trip) => tripEnd(trip).getTime()));
  const others = await db.vehicleRequest.findAll({
    attributes: ["id", "startAt", "endAt", "allDay"],
    where: {
      status: { [Op.notIn]: RELEASED_STATUSES },
      startAt: { [Op.lt]: new Date(latest) },
      endAt: { [Op.gte]: new Date(earliest - DAY_MS) },
    },
    include: [
      { model: db.vehicleRequestVehicle, as: "requestVehicles", attributes: ["vehicleId"], where: { vehicleId: vehicleIds } },
    ],
  });

  trips.forEach((trip) => {
    const booked = result.get(trip.id);
    others
      .filter((other) => other.id !== trip.id && overlaps(trip, other))
      .forEach((other) =>
        other.requestVehicles
          .filter(({ vehicleId }) => trip.vehicleIds.includes(vehicleId))
          .forEach(({ vehicleId }) => booked.set(vehicleId, [...(booked.get(vehicleId) ?? []), other.id])),
      );
  });

  return result;
};

/**
 * What stands between a vehicle and a trip `{ startAt, endAt, allDay, estimatedMiles }`.
 * `blocking` problems can't be newly assigned (FR-005); the rest are warnings (FR-006).
 */
export const tripProblems = (vehicle, condition, trip, bookedRequestIds = []) => {
  const lastDay = tripDay(trip.allDay, trip.endAt);
  const problems = [];
  const add = (type, blocking, message, extra = {}) => problems.push({ type, blocking, message, ...extra });

  if (vehicle.status === "retired") {
    add("retired", true, "Retired.");
  }

  if (condition.outOfServiceNeeds.length) {
    add("out_of_service", true, `Out of service: ${condition.outOfServiceNeeds.map(({ title }) => title).join(", ")}.`);
  }

  if (bookedRequestIds.length) {
    add("booked", true, "Booked for another trip at the same time.");
  }

  // `service` and `due` (why: overdue, by date, or by the trip's miles) let screens group several into one sentence.
  condition.services.forEach(({ serviceType, dueDate, milesLeft, state }) => {
    const service = serviceType.name;
    if (state === "overdue") {
      add("service_due", false, `${service} is overdue.`, { service, due: "overdue" });
    } else if (dueDate !== null && dueDate <= lastDay) {
      add("service_due", false, `${service} is due ${formatDay(dueDate)}, before the trip ends.`, { service, due: "date", dueDate });
    } else if (milesLeft !== null && trip.estimatedMiles != null && milesLeft < trip.estimatedMiles) {
      add(
        "service_due",
        false,
        `${service} is due in ${formatMiles(milesLeft)}, and this trip is about ${formatMiles(trip.estimatedMiles)}.`,
        { service, due: "miles", milesLeft, tripMiles: trip.estimatedMiles },
      );
    }
  });

  const plate = vehicle.licensePlateExpirationDate;
  if (plate && plate < lastDay) {
    add(
      "plate_expires",
      false,
      plate < localDay() ? `License plate expired ${formatDay(plate)}.` : `License plate expires ${formatDay(plate)}, before the trip ends.`,
    );
  }

  return problems;
};

const toTrip = (request, vehicleIds) => ({
  id: request.id,
  startAt: request.startAt,
  endAt: request.endAt,
  allDay: request.allDay,
  estimatedMiles: request.estimatedMiles,
  vehicleIds,
});

/** FR-005: the message for the first vehicle in `vehicleIds` that can't be assigned to `trip`, or null. */
export const unavailableMessage = async (vehicleIds, request, now = new Date()) => {
  if (!vehicleIds.length) {
    return null;
  }

  const vehicles = await db.vehicle.findAll({ where: { id: vehicleIds }, order: [["universityId", "ASC"]] });
  const trip = toTrip(request, vehicleIds);
  const [conditions, bookings] = await Promise.all([loadConditions(vehicles, now), findBookings([trip])]);

  for (const vehicle of vehicles) {
    const problem = tripProblems(vehicle, conditions.get(vehicle.id), trip, bookings.get(trip.id).get(vehicle.id)).find(
      ({ blocking }) => blocking,
    );
    if (problem) {
      return `Vehicle ${vehicle.universityId} can't be assigned. ${problem.message}`;
    }
  }

  return null;
};

/** True while a request's trip is still ahead or underway and could be affected (US-18.9, US-18.10). */
const flaggable = (request, now) => ACTIVE_REQUEST_STATUSES.includes(request.status) && tripEnd(request) > now;

/** US-18.9, US-18.10: problems with each request's assigned vehicles — Map request id → { vehicleId: problems }. */
export const vehicleProblemsFor = async (requests, now = new Date()) => {
  const result = new Map(requests.map(({ id }) => [id, {}]));
  const flagged = requests.filter((request) => flaggable(request, now) && request.requestVehicles.length);
  if (!flagged.length) {
    return result;
  }

  const vehicleIds = [...new Set(flagged.flatMap((request) => request.requestVehicles.map(({ vehicleId }) => vehicleId)))];
  const vehicles = await db.vehicle.findAll({ where: { id: vehicleIds } });
  const trips = flagged.map((request) => toTrip(request, request.requestVehicles.map(({ vehicleId }) => vehicleId)));
  const [conditions, bookings] = await Promise.all([loadConditions(vehicles, now), findBookings(trips)]);

  trips.forEach((trip) => {
    const problems = result.get(trip.id);
    vehicles
      .filter(({ id }) => trip.vehicleIds.includes(id))
      .forEach((vehicle) => {
        const found = tripProblems(vehicle, conditions.get(vehicle.id), trip, bookings.get(trip.id).get(vehicle.id));
        if (found.length) problems[vehicle.id] = found;
      });
  });

  return result;
};

/** FR-007: drivers whose license is expired or expires before the trip ends — { driverId: problems }. */
export const driverProblemsFor = async (request, now = new Date()) => {
  const driverIds = request.requestDrivers.map(({ driverId }) => driverId);
  if (!flaggable(request, now) || !driverIds.length) {
    return {};
  }

  const lastDay = tripDay(request.allDay, request.endAt);
  const drivers = await db.driver.findAll({ where: { id: driverIds }, attributes: ["id", "licenseExpirationDate"] });

  return Object.fromEntries(
    drivers
      .filter(({ licenseExpirationDate }) => licenseExpirationDate < lastDay)
      .map(({ id, licenseExpirationDate: expires }) => [
        id,
        [
          {
            type: "license_expires",
            blocking: false,
            message:
              expires < localDay(now)
                ? `License expired ${formatDay(expires)}.`
                : `License expires ${formatDay(expires)}, before the trip ends.`,
          },
        ],
      ]),
  );
};

/** US-18.3, US-18.11: trips the vehicle is assigned to that haven't ended, soonest first. */
export const upcomingTrips = async (vehicleId, now = new Date()) => {
  const requests = await db.vehicleRequest.findAll({
    attributes: ["id", "purpose", "startAt", "endAt", "allDay", "status"],
    where: { status: ACTIVE_REQUEST_STATUSES, endAt: { [Op.gte]: new Date(now.getTime() - DAY_MS) } },
    include: [
      { model: db.vehicleRequestVehicle, as: "requestVehicles", attributes: [], where: { vehicleId } },
      { model: db.area, as: "area", attributes: ["id", "name"] },
    ],
    order: [
      ["startAt", "ASC"],
      ["id", "ASC"],
    ],
  });

  // Same date shape as toRequestResponse: all-day trips are `YYYY-MM-DD`.
  const shown = (allDay, value) => (allDay ? tripDay(true, value) : value);

  return requests
    .filter((request) => tripEnd(request) > now)
    .map(({ id, purpose, startAt, endAt, allDay, status, area }) => ({
      id,
      purpose,
      startAt: shown(allDay, startAt),
      endAt: shown(allDay, endAt),
      allDay,
      status,
      area,
    }));
};
