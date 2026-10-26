import { Op } from "sequelize";
import db from "../models/index.js";
import logger from "../config/logger.js";
import { parseId, requiredText } from "../helpers/fields.js";

const exports = {};

const isLogoUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const logoText = (value) => String(value ?? "").trim();

const validateArea = async (name, logo, exceptId) => {
  if (!name) {
    return "Missing name.";
  }

  if (name.length > 255) {
    return "Name too long.";
  }

  const taken = await db.area.findOne({
    where: {
      name,
      ...(exceptId ? { id: { [Op.ne]: exceptId } } : {}),
    },
  });

  if (taken) {
    return "Name already taken.";
  }

  if (logo && !isLogoUrl(logo)) {
    return "Invalid logo URL.";
  }

  return null;
};

exports.findAll = async (req, res) => {
  try {
    const areas = await db.area.findAll({
      order: [["name", "ASC"]],
    });

    return res.send(areas);
  } catch (err) {
    logger.error(`area findAll failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch areas." });
  }
};

exports.findOne = async (req, res) => {
  try {
    const areaId = parseId(req.params.areaId);
    if (areaId === null) {
      return res.status(400).send({ message: "Invalid area id." });
    }

    const area = await db.area.findByPk(areaId);
    if (!area) {
      return res.status(404).send({ message: `Area with id=${areaId} not found.` });
    }

    return res.send(area);
  } catch (err) {
    logger.error(`area findOne failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch area." });
  }
};

exports.create = async (req, res) => {
  try {
    const name = requiredText(req.body.name);
    const logo = logoText(req.body.logo);
    const message = await validateArea(name, logo);

    if (message) {
      return res.status(400).send({ message });
    }

    const area = await db.area.create({ name, logo });
    return res.status(201).send(area);
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).send({ message: "Name already taken." });
    }

    logger.error(`area create failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to create area." });
  }
};

exports.update = async (req, res) => {
  try {
    const areaId = parseId(req.params.areaId);
    if (areaId === null) {
      return res.status(400).send({ message: "Invalid area id." });
    }

    const existing = await db.area.findByPk(areaId);
    if (!existing) {
      return res.status(404).send({ message: `Area with id=${areaId} not found.` });
    }

    const name = Object.hasOwn(req.body, "name") ? requiredText(req.body.name) : existing.name;
    const logo = Object.hasOwn(req.body, "logo") ? logoText(req.body.logo) : existing.logo;
    const message = await validateArea(name, logo, areaId);

    if (message) {
      return res.status(400).send({ message });
    }

    await db.area.update({ name, logo }, { where: { id: areaId } });
    await existing.reload();

    return res.status(200).send(existing);
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).send({ message: "Name already taken." });
    }

    logger.error(`area update failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to update area." });
  }
};

exports.remove = async (req, res) => {
  try {
    const areaId = parseId(req.params.areaId);
    if (areaId === null) {
      return res.status(400).send({ message: "Invalid area id." });
    }

    const existing = await db.area.findByPk(areaId);
    if (!existing) {
      return res.status(404).send({ message: `Area with id=${areaId} not found.` });
    }

    await db.area.destroy({ where: { id: areaId } });

    return res.status(200).send({ message: "Area deleted successfully." });
  } catch (err) {
    logger.error(`area delete failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to delete area." });
  }
};

export default exports;
