import db from "../models/index.js";
import logger from "../config/logger.js";
import { parseId, requiredText } from "../helpers/fields.js";

const exports = {};

const requiredDate = (value) => {
  const text = requiredText(value);
  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return null;
  }

  return text;
};

const validateSemester = (name, startDate, endDate) => {
  if (!name || !startDate || !endDate) {
    return "Required";
  }

  if (name.length > 255) {
    return "Semester name cannot be longer than 255 characters.";
  }

  if (endDate < startDate) {
    return "End date must be on or after the start date.";
  }

  return null;
};

exports.findAll = async (req, res) => {
  try {
    const semesters = await db.semester.findAll({
      order: [["startDate", "ASC"], ["name", "ASC"]],
    });

    return res.send(semesters);
  } catch (err) {
    logger.error(`semester findAll failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch semesters." });
  }
};

exports.findOne = async (req, res) => {
  try {
    const semesterId = parseId(req.params.id);
    if (semesterId === null) {
      return res.status(400).send({ message: "Invalid semester id." });
    }

    const semester = await db.semester.findByPk(semesterId);
    if (!semester) {
      return res.status(404).send({ message: `Semester with id=${semesterId} not found.` });
    }

    return res.send(semester);
  } catch (err) {
    logger.error(`semester findOne failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch semester." });
  }
};

exports.create = async (req, res) => {
  try {
    const name = requiredText(req.body.name);
    const startDate = requiredDate(req.body.startDate);
    const endDate = requiredDate(req.body.endDate);
    const message = validateSemester(name, startDate, endDate);

    if (message) {
      return res.status(400).send({ message });
    }

    const semester = await db.semester.create({
      name,
      startDate,
      endDate,
    });

    return res.status(201).send(semester);
  } catch (err) {
    logger.error(`semester create failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to create semester." });
  }
};

exports.update = async (req, res) => {
  try {
    const semesterId = parseId(req.params.id ?? req.body.id);
    if (semesterId === null) {
      return res.status(400).send({ message: "Invalid semester id." });
    }

    const existing = await db.semester.findByPk(semesterId);
    if (!existing) {
      return res.status(404).send({
        message: `Semester with id=${semesterId} not found.`,
      });
    }

    const name = requiredText(req.body.name);
    const startDate = requiredDate(req.body.startDate);
    const endDate = requiredDate(req.body.endDate);
    const message = validateSemester(name, startDate, endDate);

    if (message) {
      return res.status(400).send({ message });
    }

    await db.semester.update(
      { name, startDate, endDate },
      { where: { id: semesterId } },
    );
    await existing.reload();

    return res.status(200).send(existing);
  } catch (err) {
    logger.error(`semester update failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to update semester." });
  }
};

exports.remove = async (req, res) => {
  try {
    const semesterId = parseId(req.params.id);
    if (semesterId === null) {
      return res.status(400).send({ message: "Invalid semester id." });
    }

    const existing = await db.semester.findByPk(semesterId);
    if (!existing) {
      return res.status(404).send({
        message: `Semester with id=${semesterId} not found.`,
      });
    }

    await db.semester.destroy({ where: { id: semesterId } });

    return res.status(200).send({ message: "semester deleted successfully." });
  } catch (err) {
    logger.error(`semester delete failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to delete semester." });
  }
};

export default exports;
