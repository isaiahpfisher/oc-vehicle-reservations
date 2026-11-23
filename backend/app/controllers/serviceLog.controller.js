import db from "../models/index.js";
import logger from "../config/logger.js";
import { canAccessArea, holdsAnyRole } from "../authorization/authorization.js";
import { odometerProblem } from "../helpers/odometer.js";

const exports = {};

const FUTURE_DATE = "Serviced date can't be in the future.";
const WRONG_AREA = "Not authorized for the specified area.";

const withRelations = [
  { model: db.user, as: "user", attributes: ["id", "firstName", "lastName"] },
  { model: db.vehicle, as: "vehicle", attributes: ["id", "universityId", "areaId"] },
  { model: db.serviceType, as: "serviceType", attributes: ["id", "name"] },
  { model: db.mileageLog, as: "mileageLog", attributes: ["id", "odometerReading"] },
  { model: db.maintenanceNeed, as: "maintenanceNeed", attributes: ["id", "title", "vehicleId"] },
];

const asDate = (value) => {
  if (!value) {
    return value;
  }

  if (value instanceof Date) {
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${value.getFullYear()}-${month}-${day}`;
  }

  return String(value).slice(0, 10);
};

const todayString = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

const present = (log) => ({
  id: log.id,
  userId: log.userId,
  vehicleId: log.vehicleId,
  serviceTypeId: log.serviceTypeId,
  mileageLogId: log.mileageLogId,
  maintenanceNeedId: log.maintenanceNeedId,
  servicedAt: asDate(log.servicedAt),
  user: log.user ? { id: log.user.id, firstName: log.user.firstName, lastName: log.user.lastName } : null,
  vehicle: log.vehicle ? { id: log.vehicle.id, universityId: log.vehicle.universityId } : null,
  serviceType: log.serviceType ? { id: log.serviceType.id, name: log.serviceType.name } : null,
  mileageLog: log.mileageLog ? { id: log.mileageLog.id, odometerReading: log.mileageLog.odometerReading } : null,
  maintenanceNeed: log.maintenanceNeed ? { id: log.maintenanceNeed.id, title: log.maintenanceNeed.title } : null,
  createdAt: log.createdAt,
  updatedAt: log.updatedAt,
});

const idFrom = (value) => {
  const text = String(value ?? "");
  if (!/^\d+$/.test(text)) {
    return null;
  }

  return Number(text);
};

const requiredId = (value, missing, invalid) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return { message: missing };
  }

  const text = String(value).trim();
  if (!/^\d+$/.test(text) || Number(text) < 1) {
    return { message: invalid };
  }

  return { value: Number(text) };
};

const milesField = (value) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return { message: "Missing mileage." };
  }

  if (typeof value === "number") {
    if (!Number.isInteger(value)) {
      return { message: "Mileage must be a whole number." };
    }

    if (value < 0) {
      return { message: "Mileage must be zero or greater." };
    }

    return { value };
  }

  const text = String(value).trim();
  if (!/^-?\d+$/.test(text)) {
    return { message: "Mileage must be a whole number." };
  }

  const number = Number(text);
  if (number < 0) {
    return { message: "Mileage must be zero or greater." };
  }

  return { value: number };
};

const maintenanceNeedField = (value) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return { value: null };
  }

  const text = String(value).trim();
  if (!/^\d+$/.test(text) || Number(text) < 1) {
    return { message: "Invalid maintenance need." };
  }

  return { value: Number(text) };
};

const servicedAtField = (value) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return { message: "Missing serviced date." };
  }

  const text = String(value).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) {
    return { message: "Enter a real serviced date." };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return { message: "Enter a real serviced date." };
  }

  if (text > todayString()) {
    return { message: FUTURE_DATE };
  }

  return { value: text };
};

const mayManageVehicle = (user, vehicle) =>
  holdsAnyRole(user, ["maintenance"]) || canAccessArea(user, vehicle.areaId);

const allowVehicle = (user, vehicle, res) => {
  if (!mayManageVehicle(user, vehicle)) {
    res.status(403).send({ message: WRONG_AREA });
    return false;
  }

  return true;
};

const serviceLogIdFrom = (req, res) => {
  const serviceLogId = idFrom(req.params.serviceLogId);
  if (serviceLogId === null) {
    res.status(400).send({ message: "Invalid service log id." });
    return null;
  }

  return serviceLogId;
};

const loadLog = async (req, res) => {
  const serviceLogId = serviceLogIdFrom(req, res);
  if (serviceLogId === null) {
    return null;
  }

  const log = await db.serviceLog.findByPk(serviceLogId, { include: withRelations });
  if (!log) {
    res.status(404).send({ message: `Service log with id=${serviceLogId} not found.` });
    return null;
  }

  return log;
};

const readBody = async (body) => {
  const user = requiredId(body.userId, "Missing user.", "Invalid user.");
  if (user.message) {
    return user;
  }

  const vehicle = requiredId(body.vehicleId, "Missing vehicle.", "Invalid vehicle.");
  if (vehicle.message) {
    return vehicle;
  }

  const serviceType = requiredId(body.serviceTypeId, "Missing service type.", "Invalid service type.");
  if (serviceType.message) {
    return serviceType;
  }

  const miles = milesField(body.miles);
  if (miles.message) {
    return miles;
  }

  const maintenanceNeed = maintenanceNeedField(body.maintenanceNeedId);
  if (maintenanceNeed.message) {
    return maintenanceNeed;
  }

  const servicedAt = servicedAtField(body.servicedAt);
  if (servicedAt.message) {
    return servicedAt;
  }

  const existingUser = await db.user.findByPk(user.value, {
    attributes: ["id"],
    include: [{ model: db.role, as: "roles", attributes: ["role"] }],
  });
  if (!existingUser) {
    return { status: 404, message: "User not found." };
  }

  if (!existingUser.roles.some(({ role }) => role === "maintenance")) {
    return { message: "User does not have maintenance role." };
  }

  const existingVehicle = await db.vehicle.findByPk(vehicle.value, {
    attributes: ["id", "universityId", "areaId"],
  });
  if (!existingVehicle) {
    return { status: 404, message: "Vehicle not found." };
  }

  const existingType = await db.serviceType.findByPk(serviceType.value, { attributes: ["id", "name"] });
  if (!existingType) {
    return { status: 404, message: "Service type not found." };
  }

  if (maintenanceNeed.value !== null) {
    const existingNeed = await db.maintenanceNeed.findByPk(maintenanceNeed.value, {
      attributes: ["id", "vehicleId"],
    });
    if (!existingNeed) {
      return { status: 404, message: "Maintenance need not found." };
    }

    if (existingNeed.vehicleId !== existingVehicle.id) {
      return { message: "Maintenance need is for a different vehicle." };
    }
  }

  return {
    value: {
      userId: existingUser.id,
      vehicle: existingVehicle,
      serviceTypeId: existingType.id,
      miles: miles.value,
      maintenanceNeedId: maintenanceNeed.value,
      servicedAt: servicedAt.value,
    },
  };
};

const sendReadError = (res, result) => res.status(result.status || 400).send({ message: result.message });

exports.findAll = async (_req, res) => {
  try {
    const logs = await db.serviceLog.findAll({
      include: withRelations,
      order: [
        ["servicedAt", "DESC"],
        ["id", "DESC"],
      ],
    });

    return res.send(logs.map(present));
  } catch (err) {
    logger.error(`service log findAll failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch service logs." });
  }
};

exports.findByVehicle = async (req, res) => {
  try {
    const vehicleId = idFrom(req.params.vehicleId);
    if (vehicleId === null) {
      return res.status(400).send({ message: "Invalid vehicle id." });
    }

    const vehicle = await db.vehicle.findByPk(vehicleId, { attributes: ["id"] });
    if (!vehicle) {
      return res.status(404).send({ message: "Vehicle not found." });
    }

    const logs = await db.serviceLog.findAll({
      where: { vehicleId: vehicle.id },
      include: withRelations,
      order: [
        ["servicedAt", "DESC"],
        ["id", "DESC"],
      ],
    });

    return res.send(logs.map(present));
  } catch (err) {
    logger.error(`service log findByVehicle failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch service logs." });
  }
};

exports.findOne = async (req, res) => {
  try {
    const log = await loadLog(req, res);
    if (!log) {
      return;
    }

    return res.send(present(log));
  } catch (err) {
    logger.error(`service log findOne failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch service log." });
  }
};

/**
 * UI/UX backlog #26: one visit can cover several services. `serviceTypeIds: [..]` (instead of `serviceTypeId`) logs
 * each of them at the same visit, sharing one odometer reading, and responds with the array of created logs.
 */
const readServiceTypeIds = async (value) => {
  if (!Array.isArray(value)) {
    return { value: null };
  }

  const texts = [...new Set(value.map((id) => String(id).trim()))];
  if (!texts.length) {
    return { message: "Missing service type." };
  }

  if (texts.some((text) => !/^\d+$/.test(text) || Number(text) < 1)) {
    return { message: "Invalid service type." };
  }

  const ids = texts.map(Number);
  if ((await db.serviceType.count({ where: { id: ids } })) !== ids.length) {
    return { status: 404, message: "Service type not found." };
  }

  return { value: ids };
};

exports.create = async (req, res) => {
  try {
    const typeIds = await readServiceTypeIds(req.body?.serviceTypeIds);
    if (typeIds.message) {
      return sendReadError(res, typeIds);
    }

    const result = await readBody(typeIds.value ? { ...req.body, serviceTypeId: typeIds.value[0] } : req.body);
    if (result.message) {
      return sendReadError(res, result);
    }

    if (!allowVehicle(req.user, result.value.vehicle, res)) {
      return;
    }

    const problem = await odometerProblem({
      vehicleId: result.value.vehicle.id,
      reading: result.value.miles,
      day: result.value.servicedAt,
      dateLabel: "Serviced date",
    });
    if (problem) {
      return res.status(400).send({ message: problem });
    }

    const created = await db.sequelize.transaction(async (transaction) => {
      const mileageLog = await db.mileageLog.create(
        {
          vehicleId: result.value.vehicle.id,
          userId: req.user.id,
          odometerReading: result.value.miles,
          recordedAt: result.value.servicedAt,
        },
        { transaction },
      );

      const logs = [];
      for (const serviceTypeId of typeIds.value ?? [result.value.serviceTypeId]) {
        logs.push(
          await db.serviceLog.create(
            {
              userId: result.value.userId,
              vehicleId: result.value.vehicle.id,
              serviceTypeId,
              mileageLogId: mileageLog.id,
              maintenanceNeedId: result.value.maintenanceNeedId,
              servicedAt: result.value.servicedAt,
            },
            { transaction },
          ),
        );
      }
      return logs;
    });

    const logs = await db.serviceLog.findAll({
      where: { id: created.map(({ id }) => id) },
      include: withRelations,
      order: [["id", "ASC"]],
    });
    return res.status(201).send(typeIds.value ? logs.map(present) : present(logs[0]));
  } catch (err) {
    logger.error(`service log create failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to create service log." });
  }
};

exports.update = async (req, res) => {
  try {
    const log = await loadLog(req, res);
    if (!log) {
      return;
    }

    const result = await readBody(req.body);
    if (result.message) {
      return sendReadError(res, result);
    }

    if (!allowVehicle(req.user, log.vehicle, res) || !allowVehicle(req.user, result.value.vehicle, res)) {
      return;
    }

    const problem = await odometerProblem({
      vehicleId: result.value.vehicle.id,
      reading: result.value.miles,
      day: result.value.servicedAt,
      excludeId: log.mileageLogId,
      dateLabel: "Serviced date",
    });
    if (problem) {
      return res.status(400).send({ message: problem });
    }

    await db.sequelize.transaction(async (transaction) => {
      await log.update(
        {
          userId: result.value.userId,
          vehicleId: result.value.vehicle.id,
          serviceTypeId: result.value.serviceTypeId,
          maintenanceNeedId: result.value.maintenanceNeedId,
          servicedAt: result.value.servicedAt,
        },
        { transaction },
      );

      const mileageLog = await db.mileageLog.findByPk(log.mileageLogId, { transaction });
      if (!mileageLog) {
        throw new Error("Mileage log missing.");
      }

      await mileageLog.update(
        {
          vehicleId: result.value.vehicle.id,
          odometerReading: result.value.miles,
          recordedAt: result.value.servicedAt,
        },
        { transaction },
      );
    });

    const updated = await db.serviceLog.findByPk(log.id, { include: withRelations });
    return res.send(present(updated));
  } catch (err) {
    logger.error(`service log update failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to update service log." });
  }
};

exports.remove = async (req, res) => {
  try {
    const log = await loadLog(req, res);
    if (!log) {
      return;
    }

    if (!allowVehicle(req.user, log.vehicle, res)) {
      return;
    }

    await log.destroy();
    return res.status(200).send({ message: "Service log deleted successfully." });
  } catch (err) {
    logger.error(`service log delete failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to delete service log." });
  }
};

/*
 * UI/UX backlog #54: a service visit is the service logs that share one odometer reading (`mileageLogId`). The service
 * log page lists visits, so a visit is edited and deleted as a whole. No schema change: these work on the same rows.
 */
const loadVisit = async (req, res) => {
  const mileageLogId = idFrom(req.params.mileageLogId);
  if (mileageLogId === null) {
    res.status(400).send({ message: "Invalid service visit id." });
    return null;
  }

  const logs = await db.serviceLog.findAll({
    where: { mileageLogId },
    include: withRelations,
    order: [["id", "ASC"]],
  });
  if (!logs.length) {
    res.status(404).send({ message: `Service visit with id=${mileageLogId} not found.` });
    return null;
  }

  if (!allowVehicle(req.user, logs[0].vehicle, res)) {
    return null;
  }

  return logs;
};

/** `PUT /service-logs/visits/:mileageLogId`: the create body (`serviceTypeIds: [..]`); services added or removed. */
exports.updateVisit = async (req, res) => {
  try {
    const logs = await loadVisit(req, res);
    if (!logs) {
      return;
    }

    const typeIds = await readServiceTypeIds(req.body?.serviceTypeIds);
    if (typeIds.message) {
      return sendReadError(res, typeIds);
    }

    if (!typeIds.value) {
      return res.status(400).send({ message: "Missing service type." });
    }

    const result = await readBody({ ...req.body, serviceTypeId: typeIds.value[0] });
    if (result.message) {
      return sendReadError(res, result);
    }

    const visitId = logs[0].mileageLogId;
    if (result.value.vehicle.id !== logs[0].vehicleId) {
      return res.status(400).send({ message: "Vehicle cannot be changed." });
    }

    const problem = await odometerProblem({
      vehicleId: result.value.vehicle.id,
      reading: result.value.miles,
      day: result.value.servicedAt,
      excludeId: visitId,
      dateLabel: "Serviced date",
    });
    if (problem) {
      return res.status(400).send({ message: problem });
    }

    await db.sequelize.transaction(async (transaction) => {
      await db.mileageLog.update(
        { odometerReading: result.value.miles, recordedAt: result.value.servicedAt },
        { where: { id: visitId }, transaction },
      );

      const shared = {
        userId: result.value.userId,
        maintenanceNeedId: result.value.maintenanceNeedId,
        servicedAt: result.value.servicedAt,
      };
      const kept = new Set();
      for (const log of logs) {
        // A service taken off the visit, or a second log of the same service, goes.
        if (!typeIds.value.includes(log.serviceTypeId) || kept.has(log.serviceTypeId)) {
          await log.destroy({ transaction });
          continue;
        }

        kept.add(log.serviceTypeId);
        await log.update(shared, { transaction });
      }

      for (const serviceTypeId of typeIds.value.filter((id) => !kept.has(id))) {
        await db.serviceLog.create(
          { ...shared, vehicleId: logs[0].vehicleId, serviceTypeId, mileageLogId: visitId },
          { transaction },
        );
      }
    });

    const updated = await db.serviceLog.findAll({
      where: { mileageLogId: visitId },
      include: withRelations,
      order: [["id", "ASC"]],
    });
    return res.send(updated.map(present));
  } catch (err) {
    logger.error(`service visit update failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to save service visit." });
  }
};

/** `DELETE /service-logs/visits/:mileageLogId`: every service at the visit. The reading stays (Feature 13). */
exports.removeVisit = async (req, res) => {
  try {
    const logs = await loadVisit(req, res);
    if (!logs) {
      return;
    }

    await db.serviceLog.destroy({ where: { mileageLogId: logs[0].mileageLogId } });
    return res.status(200).send({ message: "Service visit deleted successfully." });
  } catch (err) {
    logger.error(`service visit delete failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to delete service visit." });
  }
};

export default exports;
