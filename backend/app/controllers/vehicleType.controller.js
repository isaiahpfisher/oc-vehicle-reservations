import { Op } from "sequelize";
import db from "../models/index.js";
import logger from "../config/logger.js";
import { parseId, requiredText } from "../helpers/fields.js";

const exports = {};

const IDENTIFIERS = new Set(["VIN", "Serial"]);

const nameError = async (name, exceptId) => {
  if (!name) {
    return "Missing name.";
  }

  if (name.length > 255) {
    return "Name too long.";
  }

  const taken = await db.vehicleType.findOne({
    where: {
      [Op.and]: [
        db.sequelize.where(db.sequelize.fn("LOWER", db.sequelize.col("name")), name.toLowerCase()),
        ...(exceptId ? [{ id: { [Op.ne]: exceptId } }] : []),
      ],
    },
  });

  if (taken) {
    return "Name already taken.";
  }

  return null;
};

const identifierError = (identifier) => {
  if (identifier === undefined || identifier === null || identifier === "") {
    return "Missing identifier.";
  }

  if (!IDENTIFIERS.has(identifier)) {
    return "Unknown identifier.";
  }

  return null;
};

/**
 * Validate only the fields present in the body. On create, a field left out is missing.
 * An omitted field on update keeps the stored value, so `{ name: "" }` reports the name
 * and `{ identifier: "" }` reports the identifier.
 */
const resolveFields = async (body, { creating, exceptId, current }) => {
  let name = current?.name ?? null;
  let identifier = current?.identifier ?? null;

  if (Object.hasOwn(body, "name")) {
    name = requiredText(body.name);
    const message = await nameError(name, exceptId);
    if (message) {
      return { message };
    }
  }

  if (Object.hasOwn(body, "identifier")) {
    const message = identifierError(body.identifier);
    if (message) {
      return { message };
    }
    identifier = body.identifier;
  }

  if (creating && !Object.hasOwn(body, "name")) {
    return { message: "Missing name." };
  }

  if (creating && !Object.hasOwn(body, "identifier")) {
    return { message: "Missing identifier." };
  }

  return { name, identifier };
};

exports.findAll = async (req, res) => {
  try {
    const vehicleTypes = await db.vehicleType.findAll({
      order: [["name", "ASC"]],
    });

    return res.send(vehicleTypes);
  } catch (err) {
    logger.error(`vehicleType findAll failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch vehicle types." });
  }
};

exports.findOne = async (req, res) => {
  try {
    const vehicleTypeId = parseId(req.params.vehicleTypeId);
    if (vehicleTypeId === null) {
      return res.status(400).send({ message: "Invalid vehicle type id." });
    }

    const vehicleType = await db.vehicleType.findByPk(vehicleTypeId);
    if (!vehicleType) {
      return res.status(404).send({ message: `Vehicle type with id=${vehicleTypeId} not found.` });
    }

    return res.send(vehicleType);
  } catch (err) {
    logger.error(`vehicleType findOne failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch vehicle type." });
  }
};

exports.create = async (req, res) => {
  try {
    const resolved = await resolveFields(req.body, { creating: true });
    if (resolved.message) {
      return res.status(400).send({ message: resolved.message });
    }

    const vehicleType = await db.vehicleType.create({
      name: resolved.name,
      identifier: resolved.identifier,
    });

    return res.status(201).send(vehicleType);
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).send({ message: "Name already taken." });
    }

    logger.error(`vehicleType create failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to create vehicle type." });
  }
};

exports.update = async (req, res) => {
  try {
    const vehicleTypeId = parseId(req.params.vehicleTypeId);
    if (vehicleTypeId === null) {
      return res.status(400).send({ message: "Invalid vehicle type id." });
    }

    const existing = await db.vehicleType.findByPk(vehicleTypeId);
    if (!existing) {
      return res.status(404).send({ message: `Vehicle type with id=${vehicleTypeId} not found.` });
    }

    const resolved = await resolveFields(req.body, { creating: false, exceptId: vehicleTypeId, current: existing });
    if (resolved.message) {
      return res.status(400).send({ message: resolved.message });
    }

    await db.vehicleType.update(
      { name: resolved.name, identifier: resolved.identifier },
      { where: { id: vehicleTypeId } },
    );
    await existing.reload();

    return res.status(200).send(existing);
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).send({ message: "Name already taken." });
    }

    logger.error(`vehicleType update failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to update vehicle type." });
  }
};

exports.remove = async (req, res) => {
  try {
    const vehicleTypeId = parseId(req.params.vehicleTypeId);
    if (vehicleTypeId === null) {
      return res.status(400).send({ message: "Invalid vehicle type id." });
    }

    const existing = await db.vehicleType.findByPk(vehicleTypeId);
    if (!existing) {
      return res.status(404).send({ message: `Vehicle type with id=${vehicleTypeId} not found.` });
    }

    const vehicleCount = await db.vehicle.count({ where: { vehicleTypeId } });
    if (vehicleCount > 0) {
      return res.status(400).send({
        message: "Vehicle type has vehicles. Delete vehicles or reassign them to a different vehicle type first.",
      });
    }

    await db.vehicleType.destroy({ where: { id: vehicleTypeId } });

    return res.status(200).send({ message: "Vehicle type deleted successfully." });
  } catch (err) {
    logger.error(`vehicleType delete failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to delete vehicle type." });
  }
};

export default exports;
