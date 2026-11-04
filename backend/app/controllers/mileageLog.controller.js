import db from "../models/index.js";
import logger from "../config/logger.js";
import { canAccessArea } from "../authorization/authorization.js";

const exports = {};

const withRelations = [
  { model: db.user, as: "user", attributes: ["id", "firstName", "lastName"] },
  { model: db.vehicle, as: "vehicle", attributes: ["id", "universityId", "areaId"] },
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

const present = (log) => ({
  id: log.id,
  vehicleId: log.vehicleId,
  userId: log.userId,
  odometerReading: log.odometerReading,
  recordedAt: asDate(log.recordedAt),
  user: log.user
    ? { id: log.user.id, firstName: log.user.firstName, lastName: log.user.lastName }
    : null,
  vehicle: log.vehicle ? { id: log.vehicle.id, universityId: log.vehicle.universityId } : null,
  createdAt: log.createdAt,
  updatedAt: log.updatedAt,
});

const forbid = (res) => res.status(403).send({ message: "Forbidden." });

const mileageLogIdFrom = (req, res) => {
  const text = String(req.params.mileageLogId ?? "");
  if (!/^\d+$/.test(text)) {
    res.status(400).send({ message: "Invalid mileage log id." });
    return null;
  }

  return Number(text);
};

const vehicleField = (value) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return { message: "Missing vehicle." };
  }

  const text = String(value).trim();
  if (!/^\d+$/.test(text)) {
    return { message: "Missing vehicle." };
  }

  return { value: Number(text) };
};

const readingField = (value) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return { message: "Missing odometer reading." };
  }

  if (typeof value === "number") {
    if (!Number.isInteger(value)) {
      return { message: "Odometer reading must be a whole number." };
    }

    if (value < 0) {
      return { message: "Odometer reading must be zero or greater." };
    }

    return { value };
  }

  const text = String(value).trim();
  if (!/^-?\d+$/.test(text)) {
    return { message: "Odometer reading must be a whole number." };
  }

  const number = Number(text);
  if (number < 0) {
    return { message: "Odometer reading must be zero or greater." };
  }

  return { value: number };
};

const dateField = (value) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return { message: "Missing recorded date." };
  }

  const text = String(value).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) {
    return { message: "Invalid recorded date." };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return { message: "Invalid recorded date." };
  }

  return { value: text };
};

const findVehicle = async (vehicleId) => db.vehicle.findByPk(vehicleId, { attributes: ["id", "universityId", "areaId"] });

const allowVehicle = (user, vehicle, res) => {
  if (!canAccessArea(user, vehicle.areaId)) {
    forbid(res);
    return false;
  }

  return true;
};

const loadLog = async (req, res) => {
  const mileageLogId = mileageLogIdFrom(req, res);
  if (mileageLogId === null) {
    return null;
  }

  const log = await db.mileageLog.findByPk(mileageLogId, { include: withRelations });
  if (!log) {
    res.status(404).send({ message: `Mileage log with id=${mileageLogId} not found.` });
    return null;
  }

  if (!allowVehicle(req.user, log.vehicle, res)) {
    return null;
  }

  return log;
};

exports.findAll = async (req, res) => {
  try {
    const vehicle = vehicleField(req.query.vehicleId);
    if (vehicle.message) {
      return res.status(400).send({ message: vehicle.message });
    }

    const existing = await findVehicle(vehicle.value);
    if (!existing) {
      return res.status(404).send({ message: "Vehicle not found." });
    }

    if (!allowVehicle(req.user, existing, res)) {
      return;
    }

    const logs = await db.mileageLog.findAll({
      where: { vehicleId: existing.id },
      include: withRelations,
      order: [
        ["recordedAt", "DESC"],
        ["id", "DESC"],
      ],
    });

    return res.send(logs.map(present));
  } catch (err) {
    logger.error(`mileage log findAll failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch mileage logs." });
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
    logger.error(`mileage log findOne failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch mileage log." });
  }
};

exports.create = async (req, res) => {
  try {
    const vehicle = vehicleField(req.body.vehicleId);
    if (vehicle.message) {
      return res.status(400).send({ message: vehicle.message });
    }

    const reading = readingField(req.body.odometerReading);
    if (reading.message) {
      return res.status(400).send({ message: reading.message });
    }

    const recordedAt = dateField(req.body.recordedAt);
    if (recordedAt.message) {
      return res.status(400).send({ message: recordedAt.message });
    }

    const existing = await findVehicle(vehicle.value);
    if (!existing) {
      return res.status(404).send({ message: "Vehicle not found." });
    }

    if (!allowVehicle(req.user, existing, res)) {
      return;
    }

    const created = await db.mileageLog.create({
      vehicleId: existing.id,
      userId: req.user.id,
      odometerReading: reading.value,
      recordedAt: recordedAt.value,
    });
    const log = await db.mileageLog.findByPk(created.id, { include: withRelations });

    return res.status(201).send(present(log));
  } catch (err) {
    logger.error(`mileage log create failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to create mileage log." });
  }
};

exports.update = async (req, res) => {
  try {
    const log = await loadLog(req, res);
    if (!log) {
      return;
    }

    const vehicle = vehicleField(req.body.vehicleId);
    if (vehicle.message) {
      return res.status(400).send({ message: vehicle.message });
    }

    const existing = await findVehicle(vehicle.value);
    if (!existing) {
      return res.status(404).send({ message: "Vehicle not found." });
    }

    if (existing.id !== log.vehicleId) {
      return res.status(400).send({ message: "Vehicle cannot be changed." });
    }

    const reading = readingField(req.body.odometerReading);
    if (reading.message) {
      return res.status(400).send({ message: reading.message });
    }

    const recordedAt = dateField(req.body.recordedAt);
    if (recordedAt.message) {
      return res.status(400).send({ message: recordedAt.message });
    }

    await log.update({
      odometerReading: reading.value,
      recordedAt: recordedAt.value,
    });
    const updated = await db.mileageLog.findByPk(log.id, { include: withRelations });

    return res.send(present(updated));
  } catch (err) {
    logger.error(`mileage log update failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to update mileage log." });
  }
};

exports.remove = async (req, res) => {
  try {
    const log = await loadLog(req, res);
    if (!log) {
      return;
    }

    await log.destroy();

    return res.status(200).send({ message: "Mileage log deleted successfully." });
  } catch (err) {
    logger.error(`mileage log delete failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to delete mileage log." });
  }
};

export default exports;
