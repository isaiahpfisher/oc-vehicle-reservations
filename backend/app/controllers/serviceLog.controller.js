import db from "../models/index.js";
import logger from "../config/logger.js";
import { canAccessArea, holdsAnyRole } from "../authorization/authorization.js";

const exports = {};

const FUTURE_DATE = "serviced_at cannot be after current date.";
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
    return { message: "Missing serviced at." };
  }

  const text = String(value).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) {
    return { message: "Invalid serviced at." };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return { message: "Invalid serviced at." };
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

  const existingUser = await db.user.findByPk(user.value, { attributes: ["id"] });
  if (!existingUser) {
    return { status: 404, message: "User not found." };
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

exports.create = async (req, res) => {
  try {
    const result = await readBody(req.body);
    if (result.message) {
      return sendReadError(res, result);
    }

    if (!allowVehicle(req.user, result.value.vehicle, res)) {
      return;
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

      return db.serviceLog.create(
        {
          userId: result.value.userId,
          vehicleId: result.value.vehicle.id,
          serviceTypeId: result.value.serviceTypeId,
          mileageLogId: mileageLog.id,
          maintenanceNeedId: result.value.maintenanceNeedId,
          servicedAt: result.value.servicedAt,
        },
        { transaction },
      );
    });

    const log = await db.serviceLog.findByPk(created.id, { include: withRelations });
    return res.status(201).send(present(log));
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

export default exports;
