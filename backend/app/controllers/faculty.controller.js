import db from "../models/index.js";
import logger from "../config/logger.js";
import { parseId, requiredText } from "../helpers/fields.js";

const DEPARTMENTS = ["Computer Science", "Engineering", "English", "Business", "Art"];
const exports = {};

exports.findAll = async (req, res) => {
  try {
    const faculty = await db.faculty.findAll({
      order: [["firstName", "ASC"], ["lastName", "ASC"]],
    });

    return res.send(faculty);
  } catch (err) {
    logger.error(`faculty findAll failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch faculty." });
  }
};

exports.findOne = async (req, res) => {
  try {
    const facultyId = parseId(req.params.id);
    if (facultyId === null) {
      return res.status(400).send({ message: "Invalid faculty id." });
    }

    const faculty = await db.faculty.findByPk(facultyId);
    if (!faculty) {
      return res.status(404).send({ message: `Faculty with id=${facultyId} not found.` });
    }

    return res.send(faculty);
  } catch (err) {
    logger.error(`Faculty findOne failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch faculty." });
  }
};

exports.create = async (req, res) => {
  try {
    const firstName = requiredText(req.body.firstName);
    const lastName = requiredText(req.body.lastName);
    const department = requiredText(req.body.department);

    if (!firstName || !lastName || !department) {
      return res.status(400).send({ message: "Required" });
    }

    if (firstName.length > 255) {
      return res.status(400).send({
        message: "Faculty first name cannot be longer than 255 characters.",
      });
    }

    if (lastName.length > 255) {
        return res.status(400).send({
          message: "Faculty last name cannot be longer than 255 characters.",
        });
    }
    
    if (!DEPARTMENTS.includes(department)) {
      return res.status(400).send({
        message: `Department must be one of ${DEPARTMENTS.join(", ")}.`,
      });
    }

    const faculty = await db.faculty.create({
      firstName,
      lastName,
      department,
    });

    return res.status(201).send(faculty);
  } catch (err) {
    logger.error(`faculty create failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to create faculty." });
  }
};

exports.update = async (req, res) => {
  try {
    const facultyId = parseId(req.params.id ?? req.body.id);
    const firstName = requiredText(req.body.firstName);
    const lastName = requiredText(req.body.lastName);
    const department = requiredText(req.body.department);

    if (facultyId === null) {
      return res.status(400).send({ message: "Invalid faculty id." });
    }

    const existing = await db.faculty.findByPk(facultyId);
    if (!existing) {
      return res.status(404).send({
        message: `Faculty with id=${facultyId} not found.`,
      });
    }

    if (!firstName || !lastName || !department) {
      return res.status(400).send({ message: "Required" });
    }

    if (firstName.length > 255) {
      return res.status(400).send({
        message: "Faculty first name cannot be longer than 255 characters.",
      });
    }

    if (lastName.length > 255) {
      return res.status(400).send({
        message: "Faculty last name cannot be longer than 255 characters.",
      });
    }

    if (!DEPARTMENTS.includes(department)) {
      return res.status(400).send({
        message: `Department must be one of ${DEPARTMENTS.join(", ")}.`,
      });
    }

    await db.faculty.update(
      { firstName, lastName, department },
      { where: { facultyId } },
    );
    await existing.reload();

    return res.status(200).send(existing);
  } catch (err) {
    logger.error(`faculty update failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to update faculty." });
  }
};

exports.remove = async (req, res) => {
  try {
    const facultyId = parseId(req.params.id);
    if (facultyId === null) {
      return res.status(400).send({ message: "Invalid faculty id." });
    }

    const existing = await db.faculty.findByPk(facultyId);
    if (!existing) {
      return res.status(404).send({
        message: `Faculty with id=${facultyId} not found.`,
      });
    }

    await db.faculty.destroy({ where: { facultyId: facultyId } });

    return res.status(200).send({ message: "faculty deleted successfully." });
  } catch (err) {
    logger.error(`faculty delete failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to delete faculty." });
  }
};

export default exports;