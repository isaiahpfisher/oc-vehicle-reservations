import { Op } from "sequelize";
import db from "../models/index.js";
import logger from "../config/logger.js";
import { listText } from "../helpers/text.js";
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

    // UI/UX backlog #33: `?moveVehiclesTo=<type id>` moves this type's vehicles there as part of the delete.
    const moveTo = req.query.moveVehiclesTo;
    let target = null;
    if (moveTo !== undefined && String(moveTo).trim() !== "") {
      const targetId = parseId(moveTo);
      target = targetId === null || targetId === vehicleTypeId ? null : await db.vehicleType.findByPk(targetId);
      if (!target) {
        return res.status(400).send({ message: "Choose another existing vehicle type to move the vehicles to." });
      }
    }

    const vehicles = await db.vehicle.findAll({ where: { vehicleTypeId }, attributes: ["id", "universityId", "identifier"] });
    if (vehicles.length > 0 && !target) {
      return res.status(400).send({
        message: "Vehicle type has vehicles. Delete vehicles or reassign them to a different vehicle type first.",
      });
    }

    // A VIN type needs real VINs; a serial number can't move there.
    if (target?.identifier === "VIN") {
      const notVins = vehicles.filter(({ identifier }) => !/^[A-HJ-NPR-Z0-9]{17}$/i.test(identifier)).map(({ universityId }) => universityId);
      if (notVins.length) {
        return res.status(400).send({
          message: `${target.name} vehicles need a VIN, and ${listText(notVins)} ${notVins.length === 1 ? "doesn't have one" : "don't have one"}.`,
        });
      }
    }

    // UI/UX backlog #4: a type's pickup/return instructions (Feature 15) mean nothing without it, so they go with it
    // instead of the foreign key failing the delete.
    await db.sequelize.transaction(async (transaction) => {
      if (target) {
        await db.vehicle.update({ vehicleTypeId: target.id }, { where: { vehicleTypeId }, transaction });
      }
      await db.vehicleTypeInstruction.destroy({ where: { vehicleTypeId }, transaction });
      await db.vehicleType.destroy({ where: { id: vehicleTypeId }, transaction });
    });

    return res.status(200).send({ message: "Vehicle type deleted successfully." });
  } catch (err) {
    logger.error(`vehicleType delete failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to delete vehicle type." });
  }
};

export default exports;
