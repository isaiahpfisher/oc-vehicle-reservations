import { Op } from "sequelize";
import db from "../models/index.js";
import logger from "../config/logger.js";
import { DRIVER_STATUSES, LICENSE_STATES } from "../models/driver.model.js";
import { requiredInt, requiredText } from "../helpers/fields.js";

const exports = {};

const USER_TAKEN = "User is already linked to a driver.";
const PHONE_TAKEN = "Phone number already taken.";
const PHONE_NUMBER = /^\d{3}-\d{3}-\d{4}$/;
const DATE_FORMAT = "License expiration date must be in format 'yyyy-mm-dd'.";

const notFound = (res, driverId) => res.status(404).send({ message: `Driver with id=${driverId} not found.` });

const todayString = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

/** `:driverId` as an integer, or `null` after sending a 400. */
const driverIdParam = (req, res) => {
  const driverId = requiredInt(req.params.driverId);
  if (driverId === null) {
    res.status(400).send({ message: "Invalid driver id." });
  }
  return driverId;
};

/** FR-018: a body field by its camelCase name or its snake_case alias. */
const field = (body, ...keys) => {
  const key = keys.find((name) => Object.prototype.hasOwnProperty.call(body, name));
  return key ? { present: true, value: body[key] } : { present: false };
};

const readName = (value, label) => {
  const text = requiredText(value);
  if (text === null) {
    return { message: `Missing ${label.toLowerCase()}.` };
  }

  return text.length > 255 ? { message: `${label} too long.` } : { value: text };
};

const readPhoneNumber = (value) => {
  const text = requiredText(value);
  if (text === null) {
    return { message: "Missing phone number." };
  }

  return PHONE_NUMBER.test(text) ? { value: text } : { message: "Phone number must be in format 'xxx-xxx-xxxx'." };
};

const readLicenseState = (value) => {
  const text = requiredText(value);
  if (text === null) {
    return { message: "Missing license state." };
  }

  return LICENSE_STATES.includes(text) ? { value: text } : { message: "Invalid license state." };
};

const readExpirationDate = (value) => {
  const text = requiredText(value);
  if (text === null) {
    return { message: "Missing license expiration date." };
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) {
    return { message: DATE_FORMAT };
  }

  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return { message: DATE_FORMAT };
  }

  return { value: text };
};

const readStatus = (value) => {
  const text = requiredText(value);
  if (text === null) {
    return { value: "pending" };
  }

  return DRIVER_STATUSES.includes(text) ? { value: text } : { message: "Invalid status." };
};

/** A linked user must exist and have no other driver (FR-003, FR-014). A blank value unlinks. */
const readUserId = async (value, driverId) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return { value: null };
  }

  const userId = requiredInt(String(value).trim());
  if (userId === null || !(await db.user.findByPk(userId, { attributes: ["id"] }))) {
    return { message: "User does not exist." };
  }

  const linked = await db.driver.findOne({ where: { userId }, attributes: ["id"] });
  return linked && linked.id !== driverId ? { message: USER_TAKEN } : { value: userId };
};

const REQUIRED_FIELDS = [
  ["firstName", ["firstName", "first_name"], (value) => readName(value, "First name")],
  ["lastName", ["lastName", "last_name"], (value) => readName(value, "Last name")],
  ["phoneNumber", ["phoneNumber", "phone_number"], readPhoneNumber],
  ["licenseState", ["licenseState", "license_state"], readLicenseState],
  ["licenseExpirationDate", ["licenseExpirationDate", "license_expiration_date"], readExpirationDate],
];

/**
 * Validate a body into model values, or `{ message }` for a 400. `approvedAt` is only ever set here (FR-012).
 * On update (`driver` given), a field left out of the body keeps its stored value.
 */
const resolveDriver = async (body, driver = null) => {
  const creating = !driver;
  const values = {};

  const user = field(body, "userId", "user_id");
  if (user.present || creating) {
    const read = await readUserId(user.value, driver?.id);
    if (read.message) {
      return read;
    }

    values.userId = read.value;
  }

  for (const [name, keys, reader] of REQUIRED_FIELDS) {
    const input = field(body, ...keys);
    if (input.present || creating) {
      const read = reader(input.value);
      if (read.message) {
        return read;
      }

      values[name] = read.value;
    }
  }

  // FR-021: no two drivers share a phone number.
  if (values.phoneNumber) {
    const other = await db.driver.findOne({ where: { phoneNumber: values.phoneNumber }, attributes: ["id"] });
    if (other && other.id !== driver?.id) {
      return { message: PHONE_TAKEN };
    }
  }

  const status = field(body, "status");
  if (status.present || creating) {
    const read = readStatus(status.value);
    if (read.message) {
      return read;
    }

    values.status = read.value;
    if (read.value !== driver?.status) {
      values.approvedAt = read.value === "approved" ? new Date() : null;
    }
  }

  return { values };
};

const sendWriteError = (res, err, action) => {
  if (err.name === "SequelizeUniqueConstraintError") {
    const phone = Object.keys(err.fields ?? {}).some((key) => key.includes("phone_number"));
    return res.status(400).send({ message: phone ? PHONE_TAKEN : USER_TAKEN });
  }

  logger.error(`driver ${action} failed: ${err.message}`);
  return res.status(500).send({ message: `Failed to ${action} driver.` });
};

exports.findAll = async (_req, res) => {
  try {
    const drivers = await db.driver.findAll({
      order: [
        ["lastName", "ASC"],
        ["firstName", "ASC"],
      ],
    });

    return res.send(drivers);
  } catch (err) {
    logger.error(`driver list failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch drivers." });
  }
};

exports.findSelectable = async (_req, res) => {
  try {
    const drivers = await db.driver.findAll({
      attributes: ["id", "firstName", "lastName"],
      where: {
        status: "approved",
        licenseExpirationDate: { [Op.gte]: todayString() },
      },
      order: [
        ["lastName", "ASC"],
        ["firstName", "ASC"],
      ],
    });

    return res.send(drivers);
  } catch (err) {
    logger.error(`driver selectable failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch drivers." });
  }
};

exports.findAvailableUsers = async (req, res) => {
  try {
    const { driverId } = req.query;
    const editedDriverId = driverId === undefined ? null : requiredInt(driverId);
    if (driverId !== undefined && editedDriverId === null) {
      return res.status(400).send({ message: "Invalid driver id." });
    }

    const users = await db.user.findAll({
      attributes: ["id", "firstName", "lastName", "email"],
      include: [{ model: db.driver, as: "driver", attributes: [] }],
      where: { "$driver.id$": editedDriverId === null ? null : { [Op.or]: [null, editedDriverId] } },
      order: [
        ["lastName", "ASC"],
        ["firstName", "ASC"],
      ],
    });

    return res.send(users.map(({ id, firstName, lastName, email }) => ({ id, firstName, lastName, email })));
  } catch (err) {
    logger.error(`driver available users failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch users." });
  }
};

exports.findOne = async (req, res) => {
  try {
    const driverId = driverIdParam(req, res);
    if (driverId === null) return;

    const driver = await db.driver.findByPk(driverId);
    if (!driver) {
      return notFound(res, driverId);
    }

    return res.send(driver);
  } catch (err) {
    logger.error(`driver fetch failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch driver." });
  }
};

exports.create = async (req, res) => {
  try {
    const { values, message } = await resolveDriver(req.body ?? {});
    if (message) {
      return res.status(400).send({ message });
    }

    const driver = await db.driver.create(values);
    return res.status(201).send(driver);
  } catch (err) {
    return sendWriteError(res, err, "create");
  }
};

exports.update = async (req, res) => {
  try {
    const driverId = driverIdParam(req, res);
    if (driverId === null) return;

    const driver = await db.driver.findByPk(driverId);
    if (!driver) {
      return notFound(res, driverId);
    }

    const { values, message } = await resolveDriver(req.body ?? {}, driver);
    if (message) {
      return res.status(400).send({ message });
    }

    await driver.update(values);
    return res.send(driver);
  } catch (err) {
    return sendWriteError(res, err, "update");
  }
};

exports.remove = async (req, res) => {
  try {
    const driverId = driverIdParam(req, res);
    if (driverId === null) return;

    const driver = await db.driver.findByPk(driverId);
    if (!driver) {
      return notFound(res, driverId);
    }

    // Feature 8: requests are never deleted, so a driver on any request stays.
    if ((await db.vehicleRequestDriver.count({ where: { driverId } })) > 0) {
      return res.status(400).send({
        message: "Driver is on vehicle requests and can't be deleted. Change their status to former instead.",
      });
    }

    await driver.destroy();
    return res.send({ message: "Driver deleted successfully." });
  } catch (err) {
    logger.error(`driver delete failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to delete driver." });
  }
};

export default exports;
