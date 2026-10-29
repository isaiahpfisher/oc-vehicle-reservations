import { Op } from "sequelize";
import db from "../models/index.js";
import logger from "../config/logger.js";
import { parseId, requiredInt, requiredText } from "../helpers/fields.js";
import { estimateMiles, formatAddress } from "../helpers/mileage.js";
import { getServiceStatuses } from "../helpers/vehicleService.js";
import { requestInclude, toRequestResponse } from "../helpers/vehicleRequests.js";
import { REQUEST_STATUSES } from "../models/vehicleRequest.model.js";
import { canManageRequest, canViewRequest, managedRequestsWhere } from "../authorization/vehicleRequestScope.js";

const exports = {};

const DAY_MS = 24 * 60 * 60 * 1000;
const APPROVED_STATUSES = ["awaiting_vehicle", "reserved"];
/** Statuses a requester may still cancel from. */
const OPEN_STATUSES = ["pending", "awaiting_vehicle", "reserved"];
/** Requests in these statuses don't hold their vehicles. */
const RELEASED_STATUSES = ["cancelled", "denied"];
/** Fields a requester fills in. Changing any of them on an approved request resets it to pending. */
const EDITABLE_FIELDS = ["areaId", "purpose", "startAt", "endAt", "allDay", "numberOfPeople", "drivers", "destinations"];
const NEW_DESTINATION_FIELDS = ["name", "addressLine1", "addressLine2", "city", "state", "zipCode"];

const httpError = (status, message) => Object.assign(new Error(message), { status });

const sendError = (res, err, fallback) => {
  if (err.status) {
    return res.status(err.status).send({ message: err.message });
  }

  logger.error(`${fallback} ${err.message}`);
  return res.status(500).send({ message: fallback });
};

const notFound = (res, requestId) => res.status(404).send({ message: `Vehicle request with id=${requestId} not found.` });

const dateOnly = (value) => new Date(value).toISOString().slice(0, 10);

/** All-day trips run through the end of their last day. */
const tripEnd = ({ endAt, allDay }) => new Date(new Date(endAt).getTime() + (allDay ? DAY_MS : 0));

const isBlank = (value) => value === undefined || value === null || (typeof value === "string" && !value.trim());

/** All-day dates are stored as UTC midnight so the calendar day never shifts. */
const parseDate = (value, allDay) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return allDay ? new Date(`${dateOnly(date)}T00:00:00.000Z`) : date;
};

const listOrder = [
  ["startAt", "DESC"],
  ["id", "DESC"],
];

const loadRequest = (id) => db.vehicleRequest.findByPk(id, { include: requestInclude() });

const sortedStops = (request) => [...request.stops].sort((a, b) => a.stopOrder - b.stopOrder);

/** Request values in body shape, so a PUT can merge the body over them. */
const currentValues = (request) => ({
  areaId: request.areaId,
  purpose: request.purpose,
  startAt: request.startAt,
  endAt: request.endAt,
  allDay: request.allDay,
  numberOfPeople: request.numberOfPeople,
  drivers: request.requestDrivers.map(({ driverId }) => driverId),
  destinations: sortedStops(request).map(({ destinationId }) => ({ id: destinationId })),
});

const uniqueIds = (value, label) => {
  const ids = value.map(requiredInt);
  if (ids.includes(null)) {
    throw httpError(400, `Invalid ${label}s.`);
  }

  if (new Set(ids).size !== ids.length) {
    throw httpError(400, `A ${label} is listed more than once.`);
  }

  return ids;
};

/** Every driver must be approved with a license that lasts the whole trip. */
const resolveDrivers = async (value, endAt) => {
  if (!Array.isArray(value) || !value.length) {
    throw httpError(400, "Missing drivers.");
  }

  const ids = uniqueIds(value, "driver");
  const drivers = await db.driver.findAll({ where: { id: ids } });
  if (drivers.length !== ids.length) {
    throw httpError(400, "Invalid drivers.");
  }

  const today = dateOnly(new Date());
  const lastDay = dateOnly(endAt);

  for (const driver of drivers) {
    const name = `${driver.firstName} ${driver.lastName}`;

    if (driver.status !== "approved") {
      throw httpError(400, `${name} is not an approved driver.`);
    }

    if (driver.licenseExpirationDate < lastDay) {
      throw httpError(
        400,
        driver.licenseExpirationDate < today
          ? `${name}'s license has expired.`
          : `${name}'s license expires before the trip ends.`,
      );
    }
  }

  return ids;
};

/**
 * Each stop is `{ id }` for an existing destination or address fields for a new one.
 * New destinations are built here and saved with the request.
 */
const resolveStops = async (value) => {
  if (!Array.isArray(value) || !value.length) {
    throw httpError(400, "Missing destinations.");
  }

  if (value.some((stop) => stop === null || typeof stop !== "object")) {
    throw httpError(400, "Invalid destinations.");
  }

  const ids = value.filter((stop) => stop.id !== undefined).map((stop) => requiredInt(stop.id));
  if (ids.includes(null)) {
    throw httpError(400, "Invalid destinations.");
  }

  const saved = new Map((await db.destination.findAll({ where: { id: ids } })).map((row) => [row.id, row]));

  const stops = value.map((stop, i) => {
    if (stop.id !== undefined) {
      const destination = saved.get(requiredInt(stop.id));
      if (!destination) {
        throw httpError(400, `Destination with id=${stop.id} not found.`);
      }

      return destination;
    }

    const fields = Object.fromEntries(NEW_DESTINATION_FIELDS.map((key) => [key, String(stop[key] ?? "").trim()]));
    const missing = ["name", "city", "state"].find((key) => !fields[key]);
    if (missing) {
      throw httpError(400, `Destination ${i + 1} is missing ${missing}.`);
    }

    return db.destination.build(fields);
  });

  const key = (stop) => formatAddress(stop).toLowerCase();
  if (stops.some((stop, i) => i > 0 && key(stop) === key(stops[i - 1]))) {
    throw httpError(400, "A destination is listed twice in a row.");
  }

  return stops;
};

/** Merge `body` over `current` (omitted keys keep their stored values) and validate the result. */
const resolveFields = async (body, current = {}) => {
  const value = (key) => (Object.hasOwn(body, key) ? body[key] : current[key]);

  for (const key of ["areaId", "purpose", "startAt", "endAt", "numberOfPeople"]) {
    if (isBlank(value(key))) {
      throw httpError(400, `Missing ${key}.`);
    }
  }

  const areaId = requiredInt(value("areaId"));
  if (areaId === null || !(await db.area.findByPk(areaId))) {
    throw httpError(400, "Invalid areaId.");
  }

  const allDay = value("allDay") ?? false;
  if (typeof allDay !== "boolean") {
    throw httpError(400, "Invalid allDay.");
  }

  const startAt = parseDate(value("startAt"), allDay);
  if (!startAt) {
    throw httpError(400, "Invalid startAt.");
  }

  const endAt = parseDate(value("endAt"), allDay);
  if (!endAt) {
    throw httpError(400, "Invalid endAt.");
  }

  if (endAt < startAt) {
    throw httpError(400, "endAt cannot be before startAt.");
  }

  const numberOfPeople = requiredInt(value("numberOfPeople"));
  if (numberOfPeople === null) {
    throw httpError(400, "numberOfPeople must be a non-negative integer.");
  }

  return {
    fields: {
      areaId: areaId,
      purpose: requiredText(value("purpose")),
      startAt: startAt,
      endAt: endAt,
      allDay: allDay,
      numberOfPeople: numberOfPeople,
    },
    driverIds: await resolveDrivers(value("drivers"), endAt),
    stops: await resolveStops(value("destinations")),
  };
};

const resolveVehicles = async (value, areaId) => {
  if (!Array.isArray(value)) {
    throw httpError(400, "Invalid vehicles.");
  }

  const ids = uniqueIds(value, "vehicle");
  if ((await db.vehicle.count({ where: { id: ids, areaId } })) !== ids.length) {
    throw httpError(400, "Vehicles must belong to the request's area.");
  }

  return ids;
};

const sameIds = (a, b) => [...a].sort().join() === [...b].sort().join();
const sameStops = (current, stops) =>
  current.length === stops.length && current.every(({ id }, i) => stops[i].id === id);

const approvalFieldsChanged = (current, next) =>
  ["areaId", "purpose", "allDay", "numberOfPeople"].some((key) => current[key] !== next.fields[key]) ||
  ["startAt", "endAt"].some((key) => new Date(current[key]).getTime() !== next.fields[key].getTime()) ||
  !sameIds(current.drivers, next.driverIds) ||
  !sameStops(current.destinations, next.stops);

const saveDrivers = async (requestId, driverIds, transaction) => {
  await db.vehicleRequestDriver.destroy({ where: { vehicleRequestId: requestId }, transaction });
  await db.vehicleRequestDriver.bulkCreate(
    driverIds.map((driverId) => ({ driverId, vehicleRequestId: requestId })),
    { transaction },
  );
};

const saveStops = async (requestId, stops, transaction) => {
  for (const stop of stops.filter((row) => row.isNewRecord)) {
    await stop.save({ transaction });
  }

  await db.vehicleRequestDestination.destroy({ where: { vehicleRequestId: requestId }, transaction });
  await db.vehicleRequestDestination.bulkCreate(
    stops.map((stop, i) => ({ destinationId: stop.id, vehicleRequestId: requestId, stopOrder: i + 1 })),
    { transaction },
  );
};

const saveVehicles = async (requestId, vehicleIds, transaction) => {
  await db.vehicleRequestVehicle.destroy({ where: { vehicleRequestId: requestId }, transaction });
  await db.vehicleRequestVehicle.bulkCreate(
    vehicleIds.map((vehicleId) => ({ vehicleId, vehicleRequestId: requestId })),
    { transaction },
  );
};

exports.findAll = async (req, res) => {
  try {
    const requests = await db.vehicleRequest.findAll({
      where: managedRequestsWhere(req.user),
      include: requestInclude(),
      order: listOrder,
    });

    return res.send(requests.map(toRequestResponse));
  } catch (err) {
    return sendError(res, err, "Failed to fetch vehicle requests.");
  }
};

exports.findMine = async (req, res) => {
  try {
    const requests = await db.vehicleRequest.findAll({
      where: { userId: req.user.id },
      include: requestInclude(),
      order: listOrder,
    });

    return res.send(requests.map(toRequestResponse));
  } catch (err) {
    return sendError(res, err, "Failed to fetch vehicle requests.");
  }
};

exports.findOne = async (req, res) => {
  try {
    const requestId = parseId(req.params.requestId);
    if (requestId === null) {
      return res.status(400).send({ message: "Invalid request id." });
    }

    const request = await loadRequest(requestId);
    if (!request || !canViewRequest(req.user, request)) {
      return notFound(res, requestId);
    }

    return res.send(toRequestResponse(request));
  } catch (err) {
    return sendError(res, err, "Failed to fetch vehicle request.");
  }
};

exports.create = async (req, res) => {
  try {
    const { fields, driverIds, stops } = await resolveFields(req.body);
    const estimatedMiles = await estimateMiles(stops);

    const requestId = await db.sequelize.transaction(async (transaction) => {
      const request = await db.vehicleRequest.create(
        { ...fields, userId: req.user.id, estimatedMiles: estimatedMiles, status: "pending" },
        { transaction },
      );
      await saveDrivers(request.id, driverIds, transaction);
      await saveStops(request.id, stops, transaction);
      return request.id;
    });

    return res.status(201).send(toRequestResponse(await loadRequest(requestId)));
  } catch (err) {
    return sendError(res, err, "Failed to create vehicle request.");
  }
};

exports.update = async (req, res) => {
  try {
    const requestId = parseId(req.params.requestId);
    if (requestId === null) {
      return res.status(400).send({ message: "Invalid request id." });
    }

    const request = await loadRequest(requestId);
    if (!request || !canViewRequest(req.user, request)) {
      return notFound(res, requestId);
    }

    const body = req.body;
    const editing = EDITABLE_FIELDS.some((key) => Object.hasOwn(body, key));
    const assigning = Object.hasOwn(body, "vehicles");
    const statusChanging = Object.hasOwn(body, "status") && body.status !== request.status;

    if (!canManageRequest(req.user, request)) {
      if (assigning) {
        return res.status(403).send({ message: "Only admins can assign vehicles." });
      }

      if (statusChanging && !(body.status === "cancelled" && OPEN_STATUSES.includes(request.status))) {
        return res.status(403).send({ message: "Only admins can change a request's status." });
      }

      if (editing && request.status !== "pending") {
        return res.status(403).send({ message: "This request can no longer be edited." });
      }
    }

    if (statusChanging && !REQUEST_STATUSES.includes(body.status)) {
      return res.status(400).send({ message: "Invalid status." });
    }

    const current = currentValues(request);
    const next = editing ? await resolveFields(body, current) : null;
    const areaId = next?.fields.areaId ?? request.areaId;
    const currentVehicleIds = request.requestVehicles.map(({ vehicleId }) => vehicleId);

    // Vehicles belong to an area, so moving the request to another area unassigns them.
    let vehicleIds = areaId === request.areaId ? currentVehicleIds : [];
    if (assigning) {
      vehicleIds = await resolveVehicles(body.vehicles, areaId);
    }

    let status = request.status;
    if (statusChanging) {
      status = body.status;
    } else if (assigning && !sameIds(vehicleIds, currentVehicleIds)) {
      // FR-006
      status = vehicleIds.length ? "reserved" : request.status === "reserved" ? "awaiting_vehicle" : request.status;
    } else if (next && request.approvedAt && approvalFieldsChanged(current, next)) {
      status = "pending";
    }

    let approval = {};
    if (status === "pending") {
      approval = { approverId: null, approvedAt: null };
    } else if (APPROVED_STATUSES.includes(status) && !request.approvedAt) {
      approval = { approverId: req.user.id, approvedAt: new Date() };
    }

    const estimatedMiles =
      next && !sameStops(current.destinations, next.stops) ? await estimateMiles(next.stops) : request.estimatedMiles;

    await db.sequelize.transaction(async (transaction) => {
      await request.update({ ...next?.fields, estimatedMiles: estimatedMiles, status, ...approval }, { transaction });

      if (next) {
        await saveDrivers(request.id, next.driverIds, transaction);
        await saveStops(request.id, next.stops, transaction);
      }

      if (!sameIds(vehicleIds, currentVehicleIds)) {
        await saveVehicles(request.id, vehicleIds, transaction);
      }
    });

    return res.send(toRequestResponse(await loadRequest(request.id)));
  } catch (err) {
    return sendError(res, err, "Failed to update vehicle request.");
  }
};

/** The request area's vehicles with the facts an admin needs to pick suitable ones (US-8.8). */
exports.vehicleOptions = async (req, res) => {
  try {
    const requestId = parseId(req.params.requestId);
    if (requestId === null) {
      return res.status(400).send({ message: "Invalid request id." });
    }

    const request = await loadRequest(requestId);
    if (!request || !canManageRequest(req.user, request)) {
      return notFound(res, requestId);
    }

    const assignedIds = request.requestVehicles.map(({ vehicleId }) => vehicleId);
    const vehicles = await db.vehicle.findAll({
      where: { areaId: request.areaId, [Op.or]: [{ status: "active" }, { id: assignedIds }] },
      include: [{ model: db.vehicleType, as: "vehicleType" }],
      order: [["universityId", "ASC"]],
    });

    const start = new Date(request.startAt);
    const end = tripEnd(request);
    const overlapping = (
      await db.vehicleRequest.findAll({
        where: {
          id: { [Op.ne]: request.id },
          status: { [Op.notIn]: RELEASED_STATUSES },
          startAt: { [Op.lt]: end },
          endAt: { [Op.gte]: new Date(start.getTime() - DAY_MS) },
        },
        include: [
          {
            model: db.vehicleRequestVehicle,
            as: "requestVehicles",
            where: { vehicleId: vehicles.map(({ id }) => id) },
          },
        ],
      })
    ).filter((other) => tripEnd(other) > start);

    const hasCdlDriver = request.requestDrivers.some(({ driver }) => driver.hasCdl);
    const service = await getServiceStatuses(vehicles);

    return res.send(
      vehicles.map((vehicle) => ({
        vehicle,
        cdlOk: !vehicle.vehicleType.requiresCdl || hasCdlDriver,
        conflictingRequestIds: overlapping
          .filter((other) => other.requestVehicles.some(({ vehicleId }) => vehicleId === vehicle.id))
          .map(({ id }) => id),
        ...service.get(vehicle.id),
      })),
    );
  } catch (err) {
    return sendError(res, err, "Failed to fetch vehicle options.");
  }
};

export default exports;
