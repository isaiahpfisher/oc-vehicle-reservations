import { Op } from "sequelize";
import db from "../models/index.js";
import logger from "../config/logger.js";
import { parseId, requiredText } from "../helpers/fields.js";

const exports = {};

const frequencyField = (value, field) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return { value: null };
  }

  const text = String(value).trim();
  if (!/^\d+$/.test(text) || Number(text) < 1) {
    return { message: `Invalid ${field}.` };
  }

  return { value: Number(text) };
};

const validateServiceType = async (name, daysInput, milesInput, exceptId) => {
  if (!name) {
    return { message: "Missing name." };
  }

  if (name.length > 255) {
    return { message: "Name too long." };
  }

  const days = frequencyField(daysInput, "service_frequency_days");
  if (days.message) {
    return days;
  }

  const miles = frequencyField(milesInput, "service_frequency_miles");
  if (miles.message) {
    return miles;
  }

  if (days.value === null && miles.value === null) {
    return { message: "Missing service_frequency_days or service_frequency_miles." };
  }

  const taken = await db.serviceType.findOne({
    where: {
      [Op.and]: [
        db.sequelize.where(db.sequelize.fn("LOWER", db.sequelize.col("name")), name.toLowerCase()),
        ...(exceptId ? [{ id: { [Op.ne]: exceptId } }] : []),
      ],
    },
  });

  if (taken) {
    return { message: "Name already taken." };
  }

  return {
    value: {
      name,
      service_frequency_days: days.value,
      service_frequency_miles: miles.value,
    },
  };
};

const serviceTypeIdFrom = (req, res) => {
  const serviceTypeId = parseId(req.params.serviceTypeId);
  if (serviceTypeId === null) {
    res.status(400).send({ message: "Invalid service type id." });
    return null;
  }

  return serviceTypeId;
};

exports.findAll = async (_req, res) => {
  try {
    const serviceTypes = await db.serviceType.findAll({
      order: [["name", "ASC"]],
    });

    return res.send(serviceTypes);
  } catch (err) {
    logger.error(`service type findAll failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch service types." });
  }
};

exports.findOne = async (req, res) => {
  try {
    const serviceTypeId = serviceTypeIdFrom(req, res);
    if (serviceTypeId === null) {
      return;
    }

    const serviceType = await db.serviceType.findByPk(serviceTypeId);
    if (!serviceType) {
      return res.status(404).send({ message: `Service type with id=${serviceTypeId} not found.` });
    }

    return res.send(serviceType);
  } catch (err) {
    logger.error(`service type findOne failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch service type." });
  }
};

exports.create = async (req, res) => {
  try {
    const result = await validateServiceType(
      requiredText(req.body.name),
      req.body.service_frequency_days,
      req.body.service_frequency_miles,
    );

    if (result.message) {
      return res.status(400).send({ message: result.message });
    }

    const serviceType = await db.serviceType.create(result.value);
    return res.status(201).send(serviceType);
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).send({ message: "Name already taken." });
    }

    logger.error(`service type create failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to create service type." });
  }
};

exports.update = async (req, res) => {
  try {
    const serviceTypeId = serviceTypeIdFrom(req, res);
    if (serviceTypeId === null) {
      return;
    }

    const existing = await db.serviceType.findByPk(serviceTypeId);
    if (!existing) {
      return res.status(404).send({ message: `Service type with id=${serviceTypeId} not found.` });
    }

    const result = await validateServiceType(
      requiredText(req.body.name),
      req.body.service_frequency_days,
      req.body.service_frequency_miles,
      serviceTypeId,
    );

    if (result.message) {
      return res.status(400).send({ message: result.message });
    }

    await db.serviceType.update(result.value, { where: { id: serviceTypeId } });
    await existing.reload();

    return res.status(200).send(existing);
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).send({ message: "Name already taken." });
    }

    logger.error(`service type update failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to update service type." });
  }
};

exports.remove = async (req, res) => {
  try {
    const serviceTypeId = serviceTypeIdFrom(req, res);
    if (serviceTypeId === null) {
      return;
    }

    const existing = await db.serviceType.findByPk(serviceTypeId);
    if (!existing) {
      return res.status(404).send({ message: `Service type with id=${serviceTypeId} not found.` });
    }

    await db.serviceType.destroy({ where: { id: serviceTypeId } });

    return res.status(200).send({ message: "Service type deleted successfully." });
  } catch (err) {
    logger.error(`service type delete failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to delete service type." });
  }
};

export default exports;
