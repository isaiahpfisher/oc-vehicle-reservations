import { Op } from "sequelize";
import db from "../models/index.js";
import logger from "../config/logger.js";

const exports = {};

const WRONG_AREA = "Not authorized for the specified area.";

const todayString = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

const parseVehicleId = (value) => (/^\d+$/.test(String(value)) ? Number(value) : null);

/** `null` means every area (admin). Otherwise the area ids this user administers. */
const managedAreaIds = (user) => {
  if (user.roles.some((role) => role.role === "admin")) {
    return null;
  }

  return user.roles.filter((role) => role.role === "area_admin").map((role) => Number(role.areaId));
};

const mayUseArea = (allowed, areaId) => allowed === null || allowed.includes(Number(areaId));

const field = (body, ...keys) => {
  const key = keys.find((name) => Object.prototype.hasOwnProperty.call(body, name));
  if (!key) {
    return { present: false };
  }

  return { present: true, value: body[key] };
};

const readText = (value, missing, tooLong, max) => {
  const text = value == null ? "" : String(value).trim();
  if (!text) {
    return { message: missing };
  }

  if (max && text.length > max) {
    return { message: tooLong };
  }

  return { text };
};

const readInteger = (value, messages, min, max) => {
  if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
    return { message: messages.missing };
  }

  let numeric = Number.NaN;
  if (typeof value === "number") {
    numeric = value;
  } else if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    numeric = Number(value.trim());
  }

  if (!Number.isInteger(numeric)) {
    return { message: messages.integer };
  }

  if (numeric < min || numeric > max) {
    return { message: messages.range };
  }

  return { value: numeric };
};

const readDate = (value, messages) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return messages.required ? { message: messages.required } : { value: null };
  }

  const text = String(value).trim();
  if (/[a-z]/i.test(text)) {
    return { message: messages.numerical };
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) {
    return { message: messages.format };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return { message: messages.format };
  }

  if (messages.range && (text < "1950-01-01" || text > todayString())) {
    return { message: messages.range };
  }

  return { value: text };
};

const readId = async (value, { missing, missingEntity, model, owns }) => {
  if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
    return { message: missing };
  }

  const text = String(value).trim();
  if (!/^\d+$/.test(text)) {
    return { message: missingEntity };
  }

  const id = Number(text);
  if (owns && !owns(id)) {
    return { status: 403, message: WRONG_AREA };
  }

  const row = await model.findByPk(id);
  if (!row) {
    return { message: missingEntity };
  }

  return { value: id, row };
};

const taken = async (column, value, exceptId) => {
  const where = { [column]: value };
  if (exceptId) {
    where.id = { [Op.ne]: exceptId };
  }

  return db.vehicle.findOne({ where });
};

const resolveVehicle = async (body, { creating, current, exceptId, user }) => {
  const values = {};
  const allowed = managedAreaIds(user);

  const area = field(body, "areaId", "area_id");
  if (area.present || creating) {
    const read = await readId(area.present ? area.value : "", {
      missing: "Missing area id.",
      missingEntity: "Area does not exist.",
      model: db.area,
      owns: (id) => mayUseArea(allowed, id),
    });
    if (read.message) {
      return read;
    }

    values.areaId = read.value;
  }

  const typeField = field(body, "vehicleTypeId", "vehicle_type_id");
  let typeRow = null;
  if (typeField.present || creating) {
    const read = await readId(typeField.present ? typeField.value : "", {
      missing: "Missing vehicle type id.",
      missingEntity: "Vehicle type does not exist.",
      model: db.vehicleType,
    });
    if (read.message) {
      return read;
    }

    values.vehicleTypeId = read.value;
    typeRow = read.row;
  } else if (current) {
    typeRow = await db.vehicleType.findByPk(current.vehicleTypeId);
  }

  const university = field(body, "universityId", "university_id");
  if (university.present || creating) {
    const read = readText(
      university.present ? university.value : "",
      "Missing university id.",
      "University id too long.",
      255,
    );
    if (read.message) {
      return read;
    }

    if (await taken("universityId", read.text, exceptId)) {
      return { message: "University id already taken." };
    }

    values.universityId = read.text;
  }

  const make = field(body, "make");
  if (make.present || creating) {
    const read = readText(make.present ? make.value : "", "Missing make.", "Make too long.", 255);
    if (read.message) {
      return read;
    }

    values.make = read.text;
  }

  const model = field(body, "model");
  if (model.present || creating) {
    const read = readText(model.present ? model.value : "", "Missing model.", "Model too long.", 255);
    if (read.message) {
      return read;
    }

    values.model = read.text;
  }

  const year = field(body, "year");
  if (year.present || creating) {
    const read = readInteger(
      year.present ? year.value : "",
      {
        missing: "Missing year.",
        integer: "Year must be an integer.",
        range: "Year must be between 1950 and the year after this year.",
      },
      1950,
      new Date().getFullYear() + 1,
    );
    if (read.message) {
      return read;
    }

    values.year = read.value;
  }

  const identifier = field(body, "identifier");
  const nextIdentifier = identifier.present
    ? identifier.value
    : creating
      ? ""
      : current?.identifier;
  if (identifier.present || creating || typeField.present) {
    const read = readText(nextIdentifier, "Missing identifier.", null, null);
    if (read.message) {
      return read;
    }

    if (typeRow?.identifier === "VIN" && read.text.length !== 17) {
      return { message: "VIN must be 17 characters." };
    }

    if (read.text.length > 255) {
      return { message: "Serial number too long." };
    }

    if (await taken("identifier", read.text, exceptId)) {
      return { message: "Identifier already taken." };
    }

    values.identifier = read.text;
  }

  const purchased = field(body, "purchasedAt", "purchased_at");
  if (purchased.present || creating) {
    const read = readDate(purchased.present ? purchased.value : "", {
      required: "Missing purchase date.",
      numerical: "Purchase date must be a numerical date.",
      format: "Purchase date must be in format 'yyyy-mm-dd'.",
      range: "Purchase date must be between 1950 and the current date.",
    });
    if (read.message) {
      return read;
    }

    values.purchasedAt = read.value;
  }

  const color = field(body, "color");
  if (color.present || creating) {
    const read = readText(color.present ? color.value : "", "Missing color.", "Color too long.", 255);
    if (read.message) {
      return read;
    }

    values.color = read.text;
  }

  const capacity = field(body, "passengerCapacity", "passenger_capacity");
  if (capacity.present || creating) {
    const read = readInteger(
      capacity.present ? capacity.value : "",
      {
        missing: "Missing passenger capacity.",
        integer: "Passenger capacity must be an integer.",
        range: "Passenger capacity must be between 1 and 300.",
      },
      1,
      300,
    );
    if (read.message) {
      return read;
    }

    values.passengerCapacity = read.value;
  }

  const plate = field(body, "licensePlate", "license_plate");
  if (plate.present || creating) {
    const text = plate.present && plate.value != null ? String(plate.value).trim() : "";
    if (text.length > 8) {
      return { message: "License plate too long." };
    }

    if (text && (await taken("licensePlate", text, exceptId))) {
      return { message: "License plate already taken." };
    }

    values.licensePlate = text || null;
  }

  const expiration = field(body, "licensePlateExpirationDate", "license_plate_expiration_date");
  if (expiration.present || creating) {
    const read = readDate(expiration.present ? expiration.value : "", {
      numerical: "License plate expiration date must be a numerical date.",
      format: "License plate expiration date must be in format 'yyyy-mm-dd'.",
    });
    if (read.message) {
      return read;
    }

    values.licensePlateExpirationDate = read.value;
  }

  const status = field(body, "status");
  if (status.present || creating) {
    const raw = status.present ? status.value : "";
    if (raw === undefined || raw === null || String(raw).trim() === "") {
      return { message: "Missing status." };
    }

    const text = String(raw).trim();
    if (text !== "active" && text !== "retired") {
      return { message: "Invalid status." };
    }

    values.status = text;
  }

  return { values };
};

const sendFailure = (res, result) => res.status(result.status || 400).send({ message: result.message });

exports.findAll = async (req, res) => {
  try {
    const allowed = managedAreaIds(req.user);
    if (allowed && allowed.length === 0) {
      return res.status(200).send([]);
    }

    const vehicles = await db.vehicle.findAll({
      where: allowed ? { areaId: { [Op.in]: allowed } } : undefined,
      order: [
        ["make", "ASC"],
        ["model", "ASC"],
      ],
    });

    return res.status(200).send(vehicles);
  } catch (err) {
    logger.error(`vehicle list failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch vehicles." });
  }
};

exports.findOne = async (req, res) => {
  try {
    const vehicleId = parseVehicleId(req.params.vehicleId);
    if (vehicleId === null) {
      return res.status(400).send({ message: "Invalid vehicle id." });
    }

    const vehicle = await db.vehicle.findByPk(vehicleId);
    if (!vehicle) {
      return res.status(404).send({ message: `Vehicle with id=${vehicleId} not found.` });
    }

    if (!mayUseArea(managedAreaIds(req.user), vehicle.areaId)) {
      return res.status(403).send({ message: WRONG_AREA });
    }

    return res.status(200).send(vehicle);
  } catch (err) {
    logger.error(`vehicle fetch failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch vehicle." });
  }
};

exports.create = async (req, res) => {
  try {
    const resolved = await resolveVehicle(req.body ?? {}, { creating: true, user: req.user });
    if (resolved.message) {
      return sendFailure(res, resolved);
    }

    const vehicle = await db.vehicle.create(resolved.values);
    return res.status(201).send(vehicle);
  } catch (err) {
    logger.error(`vehicle create failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to create vehicle." });
  }
};

exports.update = async (req, res) => {
  try {
    const vehicleId = parseVehicleId(req.params.vehicleId);
    if (vehicleId === null) {
      return res.status(400).send({ message: "Invalid vehicle id." });
    }

    const existing = await db.vehicle.findByPk(vehicleId);
    if (!existing) {
      return res.status(404).send({ message: `Vehicle with id=${vehicleId} not found.` });
    }

    if (!mayUseArea(managedAreaIds(req.user), existing.areaId)) {
      return res.status(403).send({ message: WRONG_AREA });
    }

    const resolved = await resolveVehicle(req.body ?? {}, {
      creating: false,
      current: existing,
      exceptId: vehicleId,
      user: req.user,
    });
    if (resolved.message) {
      return sendFailure(res, resolved);
    }

    await existing.update(resolved.values);
    return res.status(200).send(existing);
  } catch (err) {
    logger.error(`vehicle update failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to update vehicle." });
  }
};

exports.remove = async (req, res) => {
  try {
    const vehicleId = parseVehicleId(req.params.vehicleId);
    if (vehicleId === null) {
      return res.status(400).send({ message: "Invalid vehicle id." });
    }

    const existing = await db.vehicle.findByPk(vehicleId);
    if (!existing) {
      return res.status(404).send({ message: `Vehicle with id=${vehicleId} not found.` });
    }

    if (!mayUseArea(managedAreaIds(req.user), existing.areaId)) {
      return res.status(403).send({ message: WRONG_AREA });
    }

    await existing.destroy();
    return res.status(200).send({ message: "Vehicle deleted successfully." });
  } catch (err) {
    logger.error(`vehicle delete failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to delete vehicle." });
  }
};

export default exports;
