import { Op } from "sequelize";
import db from "../models/index.js";
import logger from "../config/logger.js";
import { parseId, requiredText } from "../helpers/fields.js";
import { bucketPath, logoFileError, removeAreaFolder, uploadAreaLogo } from "../services/areaLogoStorage.js";

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

const wantsLogoCleared = (body, file) =>
  !file &&
  (body.removeLogo === true ||
    body.removeLogo === "true" ||
    (Object.hasOwn(body, "logo") && logoText(body.logo) === ""));

const failUpload = (err, res) => {
  logger.error(`area logo upload failed: ${err.message}`);
  return res.status(500).send({ message: "Failed to upload logo." });
};

exports.create = async (req, res) => {
  try {
    const name = requiredText(req.body.name);
    const logo = req.file ? "" : logoText(req.body.logo);
    const message = await validateArea(name, logo);
    if (message) {
      return res.status(400).send({ message });
    }

    const fileMessage = logoFileError(req.file);
    if (fileMessage) {
      return res.status(400).send({ message: fileMessage });
    }

    const area = await db.area.create({ name, logo });
    if (!req.file) {
      return res.status(201).send(area);
    }

    try {
      const url = await uploadAreaLogo(area.id, req.file);
      await area.update({ logo: url });
      await area.reload();
      return res.status(201).send(area);
    } catch (err) {
      return failUpload(err, res);
    }
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

    const fileMessage = logoFileError(req.file);
    if (fileMessage) {
      return res.status(400).send({ message: fileMessage });
    }

    const name = Object.hasOwn(req.body, "name") ? requiredText(req.body.name) : existing.name;
    const clearLogo = wantsLogoCleared(req.body, req.file);
    const logo = req.file
      ? existing.logo
      : clearLogo
        ? ""
        : Object.hasOwn(req.body, "logo")
          ? logoText(req.body.logo)
          : existing.logo;
    const message = await validateArea(name, logo, areaId);
    if (message) {
      return res.status(400).send({ message });
    }

    if (req.file) {
      await existing.update({ name });
      try {
        const url = await uploadAreaLogo(existing.id, req.file);
        await existing.update({ logo: url });
        await existing.reload();
        return res.status(200).send(existing);
      } catch (err) {
        await existing.reload();
        return failUpload(err, res);
      }
    }

    if (bucketPath(existing.logo) && logo !== existing.logo) {
      await removeAreaFolder(existing.id);
    }

    await existing.update({ name, logo });
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

    const vehicleCount = await db.vehicle.count({ where: { areaId } });
    if (vehicleCount > 0) {
      return res.status(400).send({
        message: "Area has vehicles. Delete vehicles or reassign them to a different area first.",
      });
    }

    // Feature 8: requests are never deleted, so an area with requests stays.
    if ((await db.vehicleRequest.count({ where: { areaId } })) > 0) {
      return res.status(400).send({ message: "Area has vehicle requests and can't be deleted." });
    }

    await db.area.destroy({ where: { id: areaId } });
    await removeAreaFolder(areaId);

    return res.status(200).send({ message: "Area deleted successfully." });
  } catch (err) {
    logger.error(`area delete failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to delete area." });
  }
};

export default exports;
