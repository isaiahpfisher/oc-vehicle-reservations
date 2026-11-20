import { Op } from "sequelize";
import db from "../models/index.js";
import logger from "../config/logger.js";
import { parseId, requiredText } from "../helpers/fields.js";
import { canAccessArea, isAdmin } from "../authorization/authorization.js";

const exports = {};

const instructionInclude = [
  { model: db.vehicleType, as: "vehicleType", attributes: ["id", "name"] },
  { model: db.area, as: "area", attributes: ["id", "name"] },
];

const managedAreaIds = (user) =>
  user.roles.filter(({ role }) => role === "area_admin").map(({ areaId }) => areaId);

const canRead = (user, instruction) =>
  isAdmin(user) || (instruction.areaId != null && canAccessArea(user, instruction.areaId));

const toResponse = (instruction) => ({
  id: instruction.id,
  vehicleTypeId: instruction.vehicleTypeId,
  areaId: instruction.areaId,
  content: instruction.content,
  vehicleType: instruction.vehicleType
    ? { id: instruction.vehicleType.id, name: instruction.vehicleType.name }
    : null,
  area: instruction.area ? { id: instruction.area.id, name: instruction.area.name } : null,
  createdAt: instruction.createdAt,
  updatedAt: instruction.updatedAt,
});

const integerField = (value) => {
  if (value === undefined || value === null || value === "") {
    return { missing: true };
  }

  if (typeof value === "number" && Number.isInteger(value)) {
    return { value };
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    return { value: Number(value) };
  }

  return { invalid: true };
};

const instructionIdFrom = (req, res) => {
  const instructionId = parseId(req.params.vehicleTypeInstructionId);
  if (instructionId === null || !/^\d+$/.test(String(req.params.vehicleTypeInstructionId))) {
    res.status(400).send({ message: "Invalid vehicle type instruction id." });
    return null;
  }

  return instructionId;
};

const loadInstruction = async (req, res) => {
  const instructionId = instructionIdFrom(req, res);
  if (instructionId === null) {
    return null;
  }

  const instruction = await db.vehicleTypeInstruction.findByPk(instructionId, { include: instructionInclude });
  if (!instruction) {
    res.status(404).send({ message: `Vehicle type instruction with id=${instructionId} not found.` });
    return null;
  }

  if (!canRead(req.user, instruction)) {
    res.status(403).send({ message: "Forbidden." });
    return null;
  }

  return instruction;
};

const validateBody = async (body, user, exceptId) => {
  const vehicleType = integerField(body.vehicleTypeId);
  if (vehicleType.missing) {
    return { status: 400, message: "Missing vehicle type." };
  }
  if (vehicleType.invalid) {
    return { status: 400, message: "Invalid vehicle type id." };
  }

  const type = await db.vehicleType.findByPk(vehicleType.value);
  if (!type) {
    return { status: 404, message: "Vehicle type not found." };
  }

  const area = integerField(body.areaId);
  let areaId = null;
  if (area.missing) {
    if (!isAdmin(user)) {
      return { status: 400, message: "Missing area." };
    }
  } else if (area.invalid) {
    return { status: 400, message: "Invalid area id." };
  } else {
    const found = await db.area.findByPk(area.value);
    if (!found) {
      return { status: 404, message: "Area not found." };
    }
    if (!isAdmin(user) && !canAccessArea(user, found.id)) {
      return { status: 403, message: "Forbidden." };
    }
    areaId = found.id;
  }

  const content = requiredText(body.content);
  if (!content) {
    return { status: 400, message: "Missing instruction message." };
  }

  const duplicate = await db.vehicleTypeInstruction.findOne({
    where: {
      vehicleTypeId: type.id,
      areaId: areaId === null ? { [Op.is]: null } : areaId,
      ...(exceptId ? { id: { [Op.ne]: exceptId } } : {}),
    },
  });
  if (duplicate) {
    return { status: 400, message: "An instruction for this vehicle type and area already exists." };
  }

  return { value: { vehicleTypeId: type.id, areaId, content } };
};

exports.findAll = async (req, res) => {
  try {
    const where = {};
    if (!isAdmin(req.user)) {
      const areaIds = managedAreaIds(req.user);
      if (areaIds.length === 0) {
        return res.send([]);
      }
      where.areaId = { [Op.in]: areaIds };
    }

    const instructions = await db.vehicleTypeInstruction.findAll({
      where,
      include: instructionInclude,
      order: [
        [{ model: db.vehicleType, as: "vehicleType" }, "name", "ASC"],
        [{ model: db.area, as: "area" }, "name", "ASC"],
      ],
    });

    return res.send(instructions.map(toResponse));
  } catch (err) {
    logger.error(`vehicle type instruction findAll failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch vehicle type instructions." });
  }
};

exports.findOne = async (req, res) => {
  try {
    const instruction = await loadInstruction(req, res);
    if (!instruction) {
      return;
    }

    return res.send(toResponse(instruction));
  } catch (err) {
    logger.error(`vehicle type instruction findOne failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch vehicle type instruction." });
  }
};

exports.create = async (req, res) => {
  try {
    const result = await validateBody(req.body, req.user);
    if (result.message) {
      return res.status(result.status).send({ message: result.message });
    }

    const created = await db.vehicleTypeInstruction.create(result.value);
    const instruction = await db.vehicleTypeInstruction.findByPk(created.id, { include: instructionInclude });
    return res.status(201).send(toResponse(instruction));
  } catch (err) {
    logger.error(`vehicle type instruction create failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to create vehicle type instruction." });
  }
};

exports.update = async (req, res) => {
  try {
    const instruction = await loadInstruction(req, res);
    if (!instruction) {
      return;
    }

    const result = await validateBody(req.body, req.user, instruction.id);
    if (result.message) {
      return res.status(result.status).send({ message: result.message });
    }

    await instruction.update(result.value);
    const updated = await db.vehicleTypeInstruction.findByPk(instruction.id, { include: instructionInclude });
    return res.send(toResponse(updated));
  } catch (err) {
    logger.error(`vehicle type instruction update failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to update vehicle type instruction." });
  }
};

exports.remove = async (req, res) => {
  try {
    const instruction = await loadInstruction(req, res);
    if (!instruction) {
      return;
    }

    await instruction.destroy();
    return res.send({ message: "Vehicle type instruction deleted successfully." });
  } catch (err) {
    logger.error(`vehicle type instruction remove failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to delete vehicle type instruction." });
  }
};

export default exports;
